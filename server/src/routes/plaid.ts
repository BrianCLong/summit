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
    // Plaid v2 verification requires SDK/header parsing; stubbed route
    const secret = process.env.PLAID_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send('webhook disabled');
    return res.sendStatus(200);
  },
);

export default router;
