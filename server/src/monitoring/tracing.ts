import { getTracer } from '../observability/tracer.js';
import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to attach trace context to response headers.
 * This ensures downstream clients can correlate requests with traces.
 *
 * Note: Tracer initialization should happen at application bootstrap (e.g. index.ts).
 * This middleware assumes the global tracer provider is already registered.
 */
export const expressMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // getTracer() retrieves the global singleton.
    // If not initialized, it returns a safe instance (usually) or throws depending on impl.
    // Given usage in index.ts, it should be ready.
    const tracer = getTracer();

    const span = tracer.getCurrentSpan();
    if (span) {
      const traceId = span.spanContext().traceId;
      // Standard header for trace correlation
      res.setHeader('X-Trace-ID', traceId);

      // Add standard attributes to the span from the request if not already auto-instrumented
      if (req.user) {
        span.setAttribute('user.id', (req.user as any).id || 'unknown');
        span.setAttribute('user.tenant', (req.user as any).tenantId || 'unknown');
      }
    }
    next();
  };
};
