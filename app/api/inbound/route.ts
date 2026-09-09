import { NextRequest, NextResponse } from 'next/server';
import {
  Resend,
  type EmailReceivedEvent,
  type ErrorResponse,
  type WebhookEventPayload,
} from 'resend';

/** Destino final de todo e-mail encaminhado. */
const FORWARD_TO = 'oeliasandraade@gmail.com';

/**
 * Aliases atendidos por este webhook. O alias que recebeu a mensagem vira o
 * `from` do encaminhamento, então todo endereço aqui precisa estar num domínio
 * verificado para envio na conta da Resend.
 */
const ALLOWED_RECIPIENTS = [
  'contato@andradesystems.com.br',
  'elias@andradesystems.com.br',
  'contato@apprepbrasil.com.br',
  'contato@transparenciarst.com.br',
] as const;

/**
 * Usado quando nenhum alias conhecido aparece em to/cc/bcc — entrega via Bcc,
 * por exemplo, não deixa rastro no cabeçalho. Encaminha mesmo assim em vez de
 * descartar a mensagem.
 */
const FALLBACK_FROM = 'contato@andradesystems.com.br';

const RECIPIENTS: ReadonlySet<string> = new Set(ALLOWED_RECIPIENTS);

/**
 * Erros terminais: re-tentar não muda o resultado, então devolvemos 200 para a
 * Resend parar de insistir. Todo o resto cai no padrão retryable (500).
 *
 * O padrão é proposital: a API devolve `validation_error` tanto para chave
 * inválida quanto para domínio não verificado, e nesses casos perder a
 * mensagem em silêncio é muito pior do que algumas re-tentativas à toa.
 */
const TERMINAL_ERRORS: ReadonlySet<ErrorResponse['name']> = new Set([
  'not_found',
  'invalid_attachment',
  'invalid_parameter',
  'missing_required_field',
  'invalid_idempotency_key',
  'invalid_idempotent_request',
  'invalid_region',
  'method_not_allowed',
]);

/** Extrai o endereço de entradas como `Fulano <fulano@dominio.com.br>`. */
function extractAddress(value: string): string {
  const angled = value.match(/<([^>]*)>/);

  return (angled ? angled[1] : value).trim().toLowerCase();
}

/**
 * Descobre qual dos nossos aliases recebeu a mensagem. Varre cc e bcc além do
 * to: quando o alias está em cópia, `to[0]` é um endereço de terceiro e usá-lo
 * como `from` seria enviar de um domínio que não é nosso.
 */
function findReceivingAlias(data: EmailReceivedEvent['data']): string | null {
  const candidates = [
    ...(data.to ?? []),
    ...(data.cc ?? []),
    ...(data.bcc ?? []),
  ];

  for (const candidate of candidates) {
    const address = extractAddress(candidate);

    if (RECIPIENTS.has(address)) {
      return address;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    console.error('Configuração ausente', {
      hasApiKey: Boolean(apiKey),
      hasWebhookSecret: Boolean(webhookSecret),
    });

    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // A Resend assina os webhooks via Svix; o SDK espera os tres cabeçalhos
  // já extraídos, entao repassamos um a um.
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');

  if (!id || !timestamp || !signature) {
    return NextResponse.json(
      { error: 'Missing signature headers' },
      { status: 401 },
    );
  }

  const resend = new Resend(apiKey);

  // Precisa ser o corpo cru: qualquer reserialização invalida a assinatura.
  const payload = await request.text();

  let event: WebhookEventPayload;

  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const receivedBy = findReceivingAlias(event.data) ?? FALLBACK_FROM;

  const { error } = await resend.emails.receiving.forward({
    emailId: event.data.email_id,
    to: FORWARD_TO,
    from: receivedBy,
  });

  if (error) {
    const retryable = !TERMINAL_ERRORS.has(error.name);

    console.error('Forward failed', {
      emailId: event.data.email_id,
      receivedBy,
      name: error.name,
      message: error.message,
      retryable,
    });

    return NextResponse.json(
      { error: error.message, retryable },
      { status: retryable ? 500 : 200 },
    );
  }

  return NextResponse.json({
    success: true,
    forwardedTo: FORWARD_TO,
    receivedBy,
  });
}
