import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Inbound Resend Webhook',
  description: 'Inbound email forwarding with Resend and Gmail.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
