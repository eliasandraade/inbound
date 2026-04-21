# inbound

Minimal inbound email forwarder using Resend + Gmail.

## Setup

### 1. Environment Variable

Add in Vercel:

```
RESEND_API_KEY=your_api_key_here
```

### 2. Webhook

Configure in Resend:

- URL: https://your-app.vercel.app/api/inbound
- Event: email.received

### 3. Emails

- Forwarding: eliasandrade@orken.com.br → oeliasandraade@gmail.com

## Notes

- Do NOT commit .env files
- Make sure domain is verified in Resend
