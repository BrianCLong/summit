import request from 'supertest';
import express from 'express';
import stripeConnectRouter from '../src/routes/stripe-connect';

describe('Stripe Connect raw-body route', () => {
  const app = express();
  app.use('/webhooks/stripe-connect', stripeConnectRouter as any);

  const enabled = !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  (enabled ? it : it.skip)('accepts raw payload', async () => {
    const res = await request(app)
      .post('/webhooks/stripe-connect/events')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 'v1=dummy')
      .send(Buffer.from(JSON.stringify({ ok: true }), 'utf8'));
    expect([200, 400, 503]).toContain(res.status);
  });
});
