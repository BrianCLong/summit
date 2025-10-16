import { Router } from 'express';
import express from 'express';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard';

const router = Router();

router.post(
  '/events',
  webhookRatelimit,
  replayGuard(),
  express.raw({ type: '*/*', limit: '2mb' }),
  async (_req, res) => {
    const secret = process.env.SEGMENT_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send('webhook disabled');
    // Implement Segment HMAC verify if needed; stubbed
    return res.sendStatus(200);
  },
);

export default router;
