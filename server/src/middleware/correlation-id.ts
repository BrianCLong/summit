/**
 * Correlation ID Middleware
 * Ensures every request has a unique ID for tracking across logs, metrics, and traces
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes, randomUUID } from 'crypto';
import { trace as otelTrace } from '@opentelemetry/api';
import { getTracer } from '../observability/tracer.js';
import { correlationStorage } from '../config/logger.js';

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
export const TENANT_ID_HEADER = 'x-tenant-id';
const TRACEPARENT_HEADER = 'traceparent';

function parseTraceparentHeader(
  traceparent?: string | string[],
): { traceId?: string; spanId?: string } {
  const headerValue = Array.isArray(traceparent) ? traceparent[0] : traceparent;
  if (!headerValue) return {};

  const [, traceId, spanId] = headerValue.split('-');
  const isValidTraceId = traceId && /^[0-9a-f]{32}$/i.test(traceId);
  const isValidSpanId = spanId && /^[0-9a-f]{16}$/i.test(spanId);

  return {
    traceId: isValidTraceId ? traceId : undefined,
    spanId: isValidSpanId ? spanId : undefined,
  };
}

/**
 * Correlation ID middleware
 * - Generates or extracts correlation ID from request headers
 * - Adds OpenTelemetry trace/span IDs to request
 * - Injects IDs into response headers for client-side correlation
 * - Uses AsyncLocalStorage to propagate context to logger
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
  const { traceId: headerTraceId, spanId: headerSpanId } = parseTraceparentHeader(
    req.headers[TRACEPARENT_HEADER],
  );
  const activeSpan = otelTrace.getActiveSpan();
  const activeContext = activeSpan?.spanContext();

  const traceId =
    headerTraceId ||
    tracer.getTraceId() ||
    activeContext?.traceId ||
    randomBytes(16).toString('hex');
  const spanId =
    headerSpanId ||
    tracer.getSpanId() ||
    activeContext?.spanId ||
    randomBytes(8).toString('hex');

  req.traceId = traceId;
  req.spanId = spanId;

  const tenantId = (req.headers[TENANT_ID_HEADER] as string) || (req as any).user?.tenant_id || 'unknown';

  // Add to current span if available
  if (req.traceId) {
    tracer.setAttribute('correlation.id', correlationId);
    tracer.setAttribute('correlation.request_id', correlationId);
    if (tenantId !== 'unknown') {
        tracer.setAttribute('tenant.id', tenantId);
    }
  }

  // Inject correlation ID into response headers
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  res.setHeader(REQUEST_ID_HEADER, correlationId);

  // Add trace ID to response if available (for debugging)
  if (traceId) {
    res.setHeader('x-trace-id', traceId);
  }
  if (spanId) {
    res.setHeader('x-span-id', spanId);
  }

  // Setup AsyncLocalStorage context
  const store = new Map<string, string>();
  store.set('correlationId', correlationId);
  store.set('requestId', correlationId);
  store.set('traceId', traceId);
  store.set('spanId', spanId);
  store.set('tenantId', tenantId);

  if ((req as any).user) {
      store.set('principalId', (req as any).user.sub || (req as any).user.id);
  }

  correlationStorage.run(store, () => {
      next();
  });
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
  return {
    correlationId: req.correlationId,
    traceId: req.traceId,
    spanId: req.spanId,
    userId: (req as any).user?.sub || (req as any).user?.id,
    tenantId: (req as any).user?.tenant_id || (req as any).tenant_id,
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
