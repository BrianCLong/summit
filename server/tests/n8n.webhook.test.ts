import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../src/app';

describe('n8n webhook', () => {
  beforeAll(() => {
    process.env.N8N_SIGNING_SECRET = 'test-secret';
  });

  it('rejects bad signature', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/webhooks/n8n')
      .set('x-maestro-signature', 'bad')
      .send({ runId: 'r1' });
    expect(res.status).toBe(401);
  });

  it('accepts good signature', async () => {
    const app = await createApp();
    const body = JSON.stringify({
      runId: 'run-123',
      artifact: 'n8n.json',
      content: { ok: true },
    });
    const sig = crypto
      .createHmac('sha256', 'test-secret')
      .update(body)
      .digest('hex');
    const res = await request(app)
      .post('/webhooks/n8n')
      .set('content-type', 'application/json')
      .set('x-maestro-signature', sig)
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
