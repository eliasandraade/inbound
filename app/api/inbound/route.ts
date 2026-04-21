import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error('Missing RESEND_API_KEY environment variable');
}

const resend = new Resend(apiKey);

export async function POST(request: NextRequest) {
  const event = await request.json();

  if (event.type === 'email.received') {
    const { error } = await resend.emails.receiving.forward({
      emailId: event.data.email_id,
      to: 'oeliasandraade@gmail.com',
      from: 'eliasandrade@orken.com.br',
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ ok: true });
}
