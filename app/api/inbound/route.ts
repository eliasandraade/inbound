import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error('Missing RESEND_API_KEY environment variable');
}

const resend = new Resend(apiKey);
const FORWARD_TO = 'oeliasandraade@gmail.com';

export async function POST(request: NextRequest) {
  const event = await request.json();

  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true });
  }

  const receivedBy = event?.data?.to ?? event?.data?.envelope?.to ?? null;

  const { error } = await resend.emails.receiving.forward({
    emailId: event.data.email_id,
    to: FORWARD_TO,
  });

  if (error) {
    console.error('Forward failed', {
      emailId: event?.data?.email_id,
      receivedBy,
      message: error.message,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    forwardedTo: FORWARD_TO,
    receivedBy,
  });
}
