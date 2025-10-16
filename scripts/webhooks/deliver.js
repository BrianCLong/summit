import crypto from 'crypto';
import fs from 'fs';
const secret = process.env.DOCS_WEBHOOK_SECRET || 'dev';
export async function send(event, payload) {
  const body = JSON.stringify({ type: event, data: payload, ts: Date.now() });
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const url = process.env.DOCS_WEBHOOK_URL;
  if (!url) return console.warn('No DOCS_WEBHOOK_URL set');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-docs-signature': sig },
    body,
  });
  if (!res.ok) console.error('Webhook failed', res.status);
}
