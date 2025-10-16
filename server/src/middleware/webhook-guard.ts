import rateLimit from 'express-rate-limit';

const seen = new Map<string, number>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function replayGuard() {
  return (req: any, res: any, next: any) => {
    const sig =
      req.header('Stripe-Signature') || req.header('X-Hub-Signature-256') || '';
    const key = `${req.originalUrl}:${sig}`;
    const now = Date.now();
    for (const [k, v] of seen) if (v < now) seen.delete(k);
    if (sig && seen.has(key)) return res.status(409).send('replay detected');
    if (sig) seen.set(key, now + TTL_MS);
    next();
  };
}

export const webhookRatelimit = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
