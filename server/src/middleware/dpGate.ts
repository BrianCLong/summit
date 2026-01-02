// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { PrivacyBudgetLedger, LaplaceMechanism } from '../services/dp-runtime/mechanisms';
import { AppError } from '../lib/errors';
import crypto from 'crypto';
import { Redis } from 'ioredis';

const budgetLedger = new PrivacyBudgetLedger();
const laplace = new LaplaceMechanism();
const cache = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface DPConfig {
  epsilon: number;
  sensitivity: number;
  minK?: number; // k-anonymity
}

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
      };
      dp?: {
        applied: boolean;
        epsilon: number;
        mechanism: string;
      }
    }
  }
}

export const dpGate = (config: DPConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('User context required for DP', 401));
      }

      // Generate cache key based on query params and user (or tenant if appropriate)
      // Including user.id implies personalized DP or user-level caching.
      // If the query is global, we should include query params.
      const cacheKey = `dp:cache:${crypto.createHash('sha256').update(JSON.stringify({
        path: req.path,
        query: req.query,
        body: req.body
      })).digest('hex')}`;

      // Check Cache
      const cachedResponse = await cache.get(cacheKey);
      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      }

      // Check and Consume Budget Atomically
      const allowed = await budgetLedger.consumeBudgetIfAvailable(req.user.id, config.epsilon);
      if (!allowed) {
        return res.status(429).json({
          error: 'Privacy Budget Exceeded',
          details: 'You have exhausted your privacy budget for this window.'
        });
      }

      req.dp = {
        applied: true,
        epsilon: config.epsilon,
        mechanism: 'Laplace'
      };

      const originalJson = res.json;

      res.json = function(body: any) {
        if (body && typeof body === 'object') {
          // Deep traverse or specific field check
          // Simplified for now: check top-level keys
          const keys = Object.keys(body);
          let applied = false;

          for (const key of keys) {
            if (['count', 'sum', 'avg', 'mean', 'total'].includes(key) && typeof body[key] === 'number') {
               // Check k-anonymity if 'count' is present or if we treat this as a small-N check
               // For averages, we often need the count too.
               // Assuming 'count' is available for check if configured.
               if (config.minK && typeof body.count === 'number' && body.count < config.minK) {
                 return res.status(403).json({
                   error: 'Small-N Protection',
                   details: 'Result set too small to ensure privacy.'
                 });
               }

               body[key] = laplace.addNoise(body[key], config.sensitivity, config.epsilon);
               applied = true;
            }
          }

          if (applied) {
             body.dpMetadata = req.dp;
             // Cache the noisy result
             // TTL could match budget window or shorter
             cache.set(cacheKey, JSON.stringify(body), 'EX', 3600);
          }
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (err: any) {
      next(err);
    }
  };
};
