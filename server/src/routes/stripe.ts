import { Router } from 'express';
import express from 'express';
import { hmacHex, safeEqual } from '../utils/signature';

const router = Router();

router.post(
  '/events',
  express.raw({ type: '*/*', limit: '1mb' }),
  async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send('webhook disabled');
    const sig = req.header('Stripe-Signature') || '';
    // Simplified: Stripe official verification parses a signature header with timestamps; here we compare v1 hash
    const expected = hmacHex('sha256', secret, req.body as Buffer);
    const provided = sig.replace(/^v1=/, '');
    if (!safeEqual(expected, provided)) return res.status(400).send('bad signature');

    // const event = JSON.parse((req.body as Buffer).toString('utf8'));
    return res.status(200).send();
  },
);

export default router;

