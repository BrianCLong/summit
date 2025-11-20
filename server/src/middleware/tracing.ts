/**
 * OpenTelemetry Tracing Middleware
 * Adds request/trace IDs and distributed tracing support
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import pino from 'pino';

const logger = pino();
const tracer = trace.getTracer('intelgraph-api');

/**
 * Adds request ID and trace ID to all requests
 * Injects trace context for distributed tracing
 */
export function tracingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate or extract request ID
    const requestId =
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-trace-id'] as string) ||
      randomUUID();

    // Attach to request
    (req as any).requestId = requestId;
    (req as any).traceId = requestId;

    // Set response headers
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Trace-ID', requestId);

    // Create span for this request
    const span = tracer.startSpan(
      `${req.method} ${req.path}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.target': req.path,
          'http.host': req.hostname,
          'http.scheme': req.protocol,
          'http.user_agent': req.get('user-agent') || '',
          'http.request_id': requestId,
          'http.client_ip': req.ip || '',
        },
      },
      context.active(),
    );

    // Attach span to request for use in route handlers
    (req as any).span = span;

    // Log request with trace ID
    logger.info({
      msg: 'Incoming request',
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Capture response details
    const originalSend = res.send;
    res.send = function (body: any): Response {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_content_length': JSON.stringify(body).length,
      });

      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();

      logger.info({
        msg: 'Request completed',
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: Date.now() - (req as any).startTime,
      });

      return originalSend.call(this, body);
    };

    // Track request start time
    (req as any).startTime = Date.now();

    next();
  };
}

/**
 * Helper to add custom attributes to the current span
 */
export function addSpanAttributes(req: Request, attributes: Record<string, any>) {
  const span = (req as any).span;
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Helper to add span events (milestones within a request)
 */
export function addSpanEvent(req: Request, name: string, attributes?: Record<string, any>) {
  const span = (req as any).span;
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Create a child span for a specific operation
 */
export function createChildSpan(req: Request, name: string, attributes?: Record<string, any>) {
  const parentSpan = (req as any).span;
  if (!parentSpan) return null;

  return tracer.startSpan(
    name,
    {
      attributes: {
        ...attributes,
        'http.request_id': (req as any).requestId,
      },
    },
    trace.setSpan(context.active(), parentSpan),
  );
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      traceId?: string;
      span?: any;
      startTime?: number;
    }
  }
}
