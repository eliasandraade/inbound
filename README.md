# resend-inbound

Encaminhador de e-mail. Recebe o webhook `email.received` da Resend e repassa a
mensagem para uma caixa pessoal, usando o próprio alias que recebeu como `from`.

## Endereços atendidos

| Recebe em                          | Encaminha para              |
| ---------------------------------- | --------------------------- |
| `contato@andradesystems.com.br`    | `oeliasandraade@gmail.com`  |
| `elias@andradesystems.com.br`      | `oeliasandraade@gmail.com`  |
| `contato@apprepbrasil.com.br`      | `oeliasandraade@gmail.com`  |
| `contato@transparenciarst.com.br`  | `oeliasandraade@gmail.com`  |

A lista fica em `ALLOWED_RECIPIENTS`, no topo de `app/api/inbound/route.ts`.
Para adicionar um endereço novo, inclua na lista **e** cumpra os passos 1 e 2
abaixo para o domínio dele.

## Como o `from` é escolhido

A Resend só aceita enviar de domínio verificado, entao o `from` do
encaminhamento é o alias que recebeu a mensagem — nunca o remetente original.
O código procura o alias em `to`, `cc` e `bcc` (nessa ordem) e usa o primeiro
que estiver na lista. Se a mensagem chegou sem nenhum alias conhecido no
cabeçalho, cai no `FALLBACK_FROM` em vez de descartar o e-mail.

## Configuração na Resend

1. **Verificar os domínios** em <https://resend.com/domains> — `andradesystems.com.br`,
   `apprepbrasil.com.br` e `transparenciarst.com.br`. Cada um precisa de envio
   (SPF/DKIM) **e** recebimento (registro MX) ativos.
2. **Criar os endereços de recebimento** da tabela acima.
3. **Criar a chave de API** em <https://resend.com/api-keys> com permissão de
   envio e colocar em `RESEND_API_KEY`.
4. **Criar o webhook** em <https://resend.com/webhooks> apontando para
   `https://SEU-DOMINIO/api/inbound`, inscrito no evento `email.received`.
   Copiar o *Signing Secret* (`whsec_...`) para `RESEND_WEBHOOK_SECRET`.

## Variáveis de ambiente

Veja `.env.example`. As duas são obrigatórias — sem elas o endpoint devolve 500,
e sem o segredo correto toda requisição é rejeitada com 401.

```bash
cp .env.example .env.local   # e preencha os valores
```

## Rodando

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build de produção (não exige as env vars)
npm run lint
```

## Comportamento do endpoint

`POST /api/inbound` — único endpoint da aplicação.

| Situação                                    | Resposta                       |
| ------------------------------------------- | ------------------------------ |
| Sem os cabeçalhos `svix-*`                  | `401 Missing signature headers` |
| Assinatura inválida ou corpo adulterado     | `401 Invalid signature`        |
| Evento que não é `email.received`           | `200 { ok, ignored }`          |
| Encaminhou com sucesso                      | `200 { success, receivedBy }`  |
| Falhou por erro terminal (ex.: `not_found`) | `200 { error, retryable }`     |
| Falhou por erro possivelmente temporário    | `500` — a Resend re-tenta      |

O 500 é proposital: é o único jeito de pedir nova tentativa. Na dúvida o código
prefere re-tentar a dar a mensagem por entregue, para não perder e-mail.
