// Mock for middleware/rateLimit
import { Request, Response, NextFunction } from 'express';

export const rateLimit = () => (_req: Request, _res: Response, next: NextFunction) => next();

export const rateLimitMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();

export const createRateLimiter = () => rateLimitMiddleware;

export enum EndpointClass {
  AUTH = 'AUTH',
  EXPORT = 'EXPORT',
  INGEST = 'INGEST',
  QUERY = 'QUERY',
  AI = 'AI',
  DEFAULT = 'DEFAULT',
}

export const quotaManager = {
  checkQuota: async () => ({ allowed: true }),
  recordUsage: async () => {},
};

export default {
  rateLimit,
  rateLimitMiddleware,
  createRateLimiter,
  EndpointClass,
  quotaManager,
};
