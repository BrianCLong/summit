import { createClient } from 'redis';
const r = createClient({ url: process.env.REDIS_URL });
export function rateLimit(limitPerMinByPlan: Record<string, number>) {
  return async (req, res, next) => {
    const plan = req.tenant.plan;
    const lim = limitPerMinByPlan[plan] || 60;
    const key = `rl:${req.tenant.id}:${new Date().toISOString().slice(0, 16)}`; // per‑minute
    const used = await r.incr(key);
    if (used === 1) await r.expire(key, 65);
    res.setHeader('X-RateLimit-Limit', String(lim));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(lim - used, 0)));
    return used > lim
      ? res.status(429).json({ error: 'rate_limited' })
      : next();
  };
}
