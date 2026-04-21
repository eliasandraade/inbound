import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const event = await request.json();

  if (event.type === 'email.received') {
    const { data, error } = await resend.emails.receiving.forward({
      emailId: event.data.email_id,
      to: 'SEUEMAIL@gmail.com',
      from: 'elias@orken.com.br',
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ ok: true });
}
