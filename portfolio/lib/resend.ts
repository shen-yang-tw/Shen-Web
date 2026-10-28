import { Resend } from 'resend';

let client: Resend | null = null;

export function getResendClient(): Resend | null {
  if (client) return client;

  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    client = new Resend(apiKey);
  } else {
    client = null;
  }

  return client;
}

export const resend = getResendClient();
