import { createClient } from 'redis';
import { Request, Response, NextFunction } from 'express';

interface TenantRequest extends Request {
  tenant?: any;
}

const r = createClient({ url: process.env.REDIS_URL });
r.on('error', (err) => console.error('Redis Client Error', err));

// Initialize Redis connection
if (!r.isOpen) {
  r.connect();
}

export function rateLimit(limitPerMinByPlan: Record<string, number>) {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return next(); // Skip rate limiting if no tenant
    }
    
    const plan = req.tenant.plan;
    const limit = limitPerMinByPlan[plan] || 60;
    const key = `rl:${req.tenant.id}:${new Date().toISOString().slice(0, 16)}`; // per-minute
    
    try {
      const used = await r.incr(key);
      
      if (used === 1) {
        await r.expire(key, 65); // Expire after 65 seconds to handle clock skew
      }
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(limit - used, 0)));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + 60));
      
      if (used > limit) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ 
          error: 'rate_limited',
          message: `Rate limit exceeded. Current plan allows ${limit} requests per minute.`,
          plan: plan,
          limit: limit,
          used: used
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open on Redis errors
      next();
    }
  };
}

// Plan-specific rate limits
export const defaultRateLimits = {
  starter: 60,    // 1 per second
  pro: 600,       // 10 per second  
  enterprise: 6000 // 100 per second
};