import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard';

const router = Router();

router.post(
  '/events',
  webhookRatelimit,
  replayGuard(),
  express.raw({ type: '*/*', limit: '2mb' }),
  async (req: any, res) => {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send('webhook disabled');
    const h = crypto
      .createHmac('sha256', secret)
      .update(req.body as Buffer)
      .digest('base64');
    const sig = req.header('X-Shopify-Hmac-Sha256') || '';
    if (h !== sig) return res.status(401).send('bad signature');
    return res.sendStatus(200);
  },
);

export default router;
