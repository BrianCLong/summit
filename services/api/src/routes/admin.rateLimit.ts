import type { Request, Response, NextFunction } from 'express';
import { redisConnection as redisPool } from '../db/redis.js';

export function rateLimitAudit(limitPer10s = 60){
  return async (req: Request, res: Response, next: NextFunction) => {
    try{
      await (redisPool as any).connect?.();
      const token = String(req.get('x-audit-token')||'anon');
      const path = String(req.path||'').replace(/\W+/g,'_');
      const bucket = Math.floor(Date.now()/1000/10);
      const key = `audit:rl:${token}:${path}:${bucket}`;
      const n = await (redisPool as any).client?.incr(key) || 1;
      if(n === 1){ await (redisPool as any).client?.expire(key, 15); }
      const limit = limitPer10s;
      if(n > limit) return res.status(429).send('rate_limited');
    }catch{}
    next();
  };
}

