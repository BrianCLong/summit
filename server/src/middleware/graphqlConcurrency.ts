import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import baseLogger from '../config/logger';
import {
  GraphQLConcurrencyService,
  type GraphQLConcurrencyConfig,
  type ConcurrencyAcquisition,
} from '../services/graphqlConcurrencyService.js';

export interface GraphQLConcurrencyMiddlewareOptions extends GraphQLConcurrencyConfig {
  service?: GraphQLConcurrencyService;
}

const logger = baseLogger.child({ name: 'graphql-concurrency-middleware' });

function resolveUserId(req: Request): string {
  const userId = (req as any)?.user?.id || (req.headers['x-user-id'] as string) || 'anonymous';
  return userId;
}

export function createGraphQLConcurrencyMiddleware(
  options: GraphQLConcurrencyMiddlewareOptions = {},
) {
  const service = options.service ?? new GraphQLConcurrencyService(options);

  return async function graphqlConcurrencyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const userId = resolveUserId(req);
    const requestId = randomUUID();

    let acquisition: ConcurrencyAcquisition | null = null;
    try {
      acquisition = await service.acquire(userId);
    } catch (error) {
      logger.warn({ error }, 'GraphQL concurrency check failed, allowing request');
      return next();
    }

    if (!acquisition.allowed) {
      logger.debug({ userId, limit: acquisition.limit }, 'GraphQL concurrency limit reached');
      res.setHeader('Retry-After', '1');
      return res.status(429).json({
        error: 'too_many_requests',
        message: `Concurrent GraphQL limit of ${acquisition.limit} exceeded`,
      });
    }

    let released = false;
    const release = async () => {
      if (released) {
        return;
      }
      released = true;
      try {
        await service.release(userId);
      } catch (error) {
        logger.debug({ error, userId, requestId }, 'Failed to release GraphQL concurrency slot');
      }
    };

    res.on('finish', release);
    res.on('close', release);

    return next();
  };
}

export default createGraphQLConcurrencyMiddleware;
