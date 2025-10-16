import { Router } from 'express';
import express from 'express';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_API_KEY || '', {
  apiVersion: '2024-06-20',
});

router.post(
  '/events',
  express.raw({ type: '*/*', limit: '1mb' }),
  (req, res) => {
    const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send('webhook disabled');
    try {
      const sig = req.header('Stripe-Signature') || '';
      const event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        secret,
      );
      // handle event.type...
      return res.sendStatus(200);
    } catch {
      return res.status(400).send('bad signature');
    }
  },
);

export default router;
