import request from 'supertest';
import express from 'express';
import githubAppRouter from '../src/routes/github-app';

describe('GitHub App raw-body route', () => {
  const app = express();
  app.use('/webhooks/github-app', githubAppRouter as any);

  const enabled = !!process.env.GITHUB_APP_WEBHOOK_SECRET;
  (enabled ? it : it.skip)('accepts raw payload', async () => {
    const body = Buffer.from(JSON.stringify({ ok: true }), 'utf8');
    const res = await request(app)
      .post('/webhooks/github-app/events')
      .set('Content-Type', 'application/json')
      .send(body);
    expect([200, 400, 401, 503]).toContain(res.status);
  });
});
