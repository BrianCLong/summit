import { Router } from 'express';
import express from 'express';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard';

const router = Router();

router.post(
  '/events',
  webhookRatelimit,
  replayGuard(),
  express.raw({ type: '*/*', limit: '1mb' }),
  async (_req, res) => {
    // Generic auth provider webhook stub (Clerk/Auth0/etc.)
    return res.sendStatus(200);
  },
);

export default router;
