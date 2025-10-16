import { Router } from 'express';
import express from 'express';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard';

const router = Router();

router.post(
  '/sms',
  webhookRatelimit,
  replayGuard(),
  express.raw({ type: 'application/x-www-form-urlencoded', limit: '1mb' }),
  async (req, res) => {
    // NOTE: For production, verify X-Twilio-Signature using your Twilio auth token
    const secret = process.env.TWILIO_AUTH_TOKEN;
    if (!secret) return res.status(503).send('webhook disabled');
    // Signature verification omitted here; ensure to compare against header
    return res.sendStatus(200);
  },
);

export default router;
