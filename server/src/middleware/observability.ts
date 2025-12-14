import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { context, RequestContext } from '../observability/context.js';
import { logger } from '../observability/logging/logger.js';
import { metrics } from '../observability/metrics/metrics.js';

// Extend Express Request to include observability hooks if needed
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      correlationId: string;
      requestStart: [number, number];
    }
  }
}

export const observabilityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  // We do NOT trust headers for tenantId by default, and user is not yet authenticated.
  // We set tenantId to undefined initially. It will be updated by contextBindingMiddleware later.
  const tenantId = undefined;

  req.correlationId = correlationId;
  req.requestId = requestId;
  req.requestStart = process.hrtime();

  // Propagate correlationId to response header
  res.setHeader('X-Correlation-Id', correlationId);

  const ctx: RequestContext = {
    correlationId,
    requestId,
    tenantId,
  };

  // Run everything downstream in the context
  context.run(ctx, () => {
    // Log Request
    logger.info('Incoming Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      contentLength: req.get('content-length'),
    });

    // Hook into Response finish to log outcome and record metrics
    res.on('finish', () => {
      const diff = process.hrtime(req.requestStart);
      const durationSeconds = (diff[0] * 1e9 + diff[1]) / 1e9;

      const status = res.statusCode;
      const route = req.route ? req.route.path : req.path;

      // Get the latest context (it might have been updated with tenantId)
      const currentCtx = context.get();
      const currentTenantId = currentCtx?.tenantId || 'unknown';

      // Log Response
      logger.info('Request Completed', {
        method: req.method,
        url: req.url,
        status,
        duration: durationSeconds,
        tenantId: currentTenantId
      });

      // Metrics
      const labels = {
        method: req.method,
        route: route || 'unknown',
        status: status.toString(),
        tenantId: currentTenantId
      };

      metrics.incrementCounter('summit_api_requests_total', labels);
      metrics.observeHistogram('summit_api_latency_seconds', durationSeconds, {
          method: req.method,
          route: route || 'unknown'
      });

      // Removed duplicate error counting here. Let errorHandler handle summit_errors_total
      // or specific logic. However, for 404s or other errors not hitting errorHandler,
      // we might miss them. Ideally errorHandler covers all.
      // For now, to avoid double counting with errorHandler, we skip it here.
    });

    next();
  });
};
