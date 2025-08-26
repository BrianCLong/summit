import type { Request, Response, NextFunction } from "express";
import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(() => { /* log elsewhere; fail-open in dev */ });

export function rateLimit({ key = "assistant", limit = 60, windowSec = 60 } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req as any).user?.sub || req.ip;
      const rk = `rl:${key}:${id}`;
      const n = await redis.incr(rk);
      if (n === 1) await redis.expire(rk, windowSec);
      if (n > limit) return res.status(429).json({ error: "rate_limited" });
    } catch { /* soft-fail on limiter errors */ }
    next();
  };
}