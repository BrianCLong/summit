import { Router } from 'express';
import express from 'express';
import { hmacHex, safeEqual } from '../utils/signature';

const router = Router();

router.post(
  '/events',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send('webhook disabled');
    const sig = req.header('X-Hub-Signature-256') || '';
    const expected = 'sha256=' + hmacHex('sha256', secret, req.body as Buffer);
    if (!safeEqual(expected, sig)) return res.status(401).send('bad signature');

    // const payload = JSON.parse((req.body as Buffer).toString('utf8'));
    return res.status(200).send();
  },
);

export default router;
