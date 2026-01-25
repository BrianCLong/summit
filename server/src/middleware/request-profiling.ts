import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { trace } from '@opentelemetry/api';
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

  // Enhance OTel span if present (distributed tracing)
  const span = trace.getActiveSpan();
  if (span) {
    // Add high-cardinality metadata that might be useful for sampling or debugging
    span.setAttribute('http.route_name', resolveRouteName(req));
    if ((req as any).user?.tenantId) {
      span.setAttribute('app.tenant_id', (req as any).user.tenantId);
    }
  }

  res.on('finish', () => {
    const durationMs = performance.now() - start;

    if (span) {
      span.setAttribute('http.duration_ms', durationMs);
    }

    logger.info(
      {
        method: req.method,
        route: resolveRouteName(req),
        status: res.statusCode,
        durationMs,
        traceId: span?.spanContext().traceId, // Correlate log with trace
      },
      'request completed',
    );
  });
  next();
}
