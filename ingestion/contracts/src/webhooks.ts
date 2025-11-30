import { request } from 'https';

export interface WebhookPayload {
  event: string;
  contractId: string;
  version: string;
  details?: Record<string, unknown>;
}

export class WebhookDispatcher {
  async send(url: string, payload: WebhookPayload): Promise<number> {
    const body = JSON.stringify(payload);
    return new Promise((resolve, reject) => {
      const req = request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
        resolve(res.statusCode ?? 0);
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
