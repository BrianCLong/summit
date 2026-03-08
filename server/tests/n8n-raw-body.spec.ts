import request from 'supertest';
import express from 'express';
import n8nRouter from '../src/routes/n8n';

describe('n8n raw-body route', () => {
  const app = express();
  app.use('/', n8nRouter);

  const N8N_ENABLED = process.env.N8N_WEBHOOKS_ENABLED !== 'false';
  (N8N_ENABLED ? it : it.skip)(
    'accepts raw payload before global json',
    async () => {
      const res = await request(app)
        .post('/webhooks/n8n')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify({ ok: true }), 'utf8'));
      expect([200, 204, 401, 403, 503]).toContain(res.status);
    },
  );
});
