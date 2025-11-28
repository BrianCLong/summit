import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from '../middleware/correlation-id.js';
import { getTracer } from './tracer.js';

export interface RequestContext {
  correlationId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;
}

const contextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return contextStorage.getStore();
}

export const appLogger = pino({
  name: 'intelgraph-observability',
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'api_key',
    ],
    remove: true,
  },
  mixin() {
    const context = getRequestContext();
    return context
      ? {
          correlationId: context.correlationId,
          traceId: context.traceId,
          spanId: context.spanId,
          userId: context.userId,
          tenantId: context.tenantId,
        }
      : {};
  },
});

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const tracer = getTracer();
  const correlationId =
    req.correlationId ||
    (req.headers[CORRELATION_ID_HEADER] as string) ||
    (req.headers[REQUEST_ID_HEADER] as string) ||
    randomUUID();

  const traceId = req.traceId || tracer.getTraceId();
  const spanId = req.spanId || tracer.getSpanId();
  const userId = (req as any).user?.sub || (req as any).user?.id;
  const tenantId = (req as any).user?.tenant_id || (req as any).tenant_id;

  req.correlationId = correlationId;
  req.traceId = traceId;
  req.spanId = spanId;

  const context: RequestContext = {
    correlationId,
    traceId,
    spanId,
    userId,
    tenantId,
  };

  contextStorage.run(context, () => {
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    res.setHeader(REQUEST_ID_HEADER, correlationId);
    if (traceId) res.setHeader('x-trace-id', traceId);
    next();
  });
}

