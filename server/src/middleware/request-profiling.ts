import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { logger } from '../config/logger.js';

function resolveRouteName(req: Request): string {
  const routePath = req.route?.path;
  if (routePath) {
    return `${req.baseUrl || ''}${routePath}`;
  }
  return req.path || req.originalUrl || 'unknown';
}

export function requestProfilingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = performance.now();
  res.on('finish', () => {
    const durationMs = performance.now() - start;
    logger.info(
      {
        method: req.method,
        route: resolveRouteName(req),
        status: res.statusCode,
        durationMs,
      },
      'request completed',
    );
  });
  next();
}
