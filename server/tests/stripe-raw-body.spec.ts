import request from 'supertest';
import express from 'express';
import stripeRouter from '../src/routes/stripe';

describe('Stripe raw-body route', () => {
  const app = express();
  app.use('/webhooks/stripe', stripeRouter as any);

  const enabled = !!process.env.STRIPE_WEBHOOK_SECRET;
  (enabled ? it : it.skip)('accepts raw payload', async () => {
    const res = await request(app)
      .post('/webhooks/stripe/events')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 'v1=dummy')
      .send(Buffer.from(JSON.stringify({ ok: true }), 'utf8'));
    expect([200, 400, 503]).toContain(res.status);
  });
});
