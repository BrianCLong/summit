/**
 * Correlation ID Middleware
 * Ensures every request has a unique ID for tracking across logs, metrics, and traces
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { getTracer } from '../observability/tracer.js';
import { getLogContext, withLogContext } from '../config/logger.js';

// Extend Express Request type to include correlation IDs
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      traceId: string;
      spanId: string;
    }
  }
}

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Correlation ID middleware
 * - Generates or extracts correlation ID from request headers
 * - Adds OpenTelemetry trace/span IDs to request
 * - Injects IDs into response headers for client-side correlation
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Generate or extract correlation ID
  const correlationId =
    (req.headers[CORRELATION_ID_HEADER] as string) ||
    (req.headers[REQUEST_ID_HEADER] as string) ||
    randomUUID();

  // Attach to request object
  req.correlationId = correlationId;

  // Get OpenTelemetry trace/span IDs if available
  const tracer = getTracer();
  req.traceId = tracer.getTraceId() || '';
  req.spanId = tracer.getSpanId() || '';

  return withLogContext(
    {
      correlationId,
      traceId: req.traceId || undefined,
      spanId: req.spanId || undefined,
      userId: (req as any).user?.sub || (req as any).user?.id,
      tenantId: (req as any).user?.tenant_id || (req as any).tenant_id,
    },
    () => {
      // Add to current span if available
      if (req.traceId) {
        tracer.setAttribute('correlation.id', correlationId);
        tracer.setAttribute('correlation.request_id', correlationId);
      }

      // Inject correlation ID into response headers
      res.setHeader(CORRELATION_ID_HEADER, correlationId);
      res.setHeader(REQUEST_ID_HEADER, correlationId);

      // Add trace ID to response if available (for debugging)
      if (req.traceId) {
        res.setHeader('x-trace-id', req.traceId);
      }

      next();
    },
  );
}

/**
 * Get correlation context from request
 * Use this in loggers and metrics to ensure consistent labeling
 */
export function getCorrelationContext(req: Request): {
  correlationId: string;
  traceId: string;
  spanId: string;
  userId?: string;
  tenantId?: string;
} {
  const context = getLogContext();

  return {
    correlationId: req.correlationId || context.correlationId || '',
    traceId: req.traceId || context.traceId || '',
    spanId: req.spanId || context.spanId || '',
    userId:
      (req as any).user?.sub ||
      (req as any).user?.id ||
      context.userId,
    tenantId: (req as any).user?.tenant_id || (req as any).tenant_id || context.tenantId,
  };
}

/**
 * Extract user context for observability
 */
export function getUserContext(req: Request): {
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  role?: string;
} {
  const user = (req as any).user;
  return {
    userId: user?.sub || user?.id,
    userEmail: user?.email,
    tenantId: user?.tenant_id,
    role: user?.role,
  };
}
