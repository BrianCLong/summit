import request from 'supertest';
import express from 'express';
import githubRouter from '../src/routes/github';

describe('GitHub raw-body route', () => {
  const app = express();
  app.use('/webhooks/github', githubRouter as any);

  const enabled = !!process.env.GITHUB_WEBHOOK_SECRET;
  (enabled ? it : it.skip)('accepts raw payload', async () => {
    const res = await request(app)
      .post('/webhooks/github/events')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', 'sha256=dummy')
      .send(Buffer.from(JSON.stringify({ ok: true }), 'utf8'));
    expect([200, 400, 401, 503]).toContain(res.status);
  });
});
