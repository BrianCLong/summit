import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { context as otelContext, trace } from '@opentelemetry/api';

import { bindLogContext, setLogContext } from './context.js';
import type { StructuredLogger } from './logger.js';

export interface RequestContextOptions {
  headerNames?: {
    correlationId?: string;
    requestId?: string;
  };
  resolveUserId?: (req: Request) => string | undefined;
  resolveTenantId?: (req: Request) => string | undefined;
  logger?: StructuredLogger;
}

const defaultHeaders = {
  correlationId: 'x-correlation-id',
  requestId: 'x-request-id',
};

export function requestContextMiddleware(options: RequestContextOptions = {}) {
  const headers = { ...defaultHeaders, ...(options.headerNames ?? {}) };

  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId =
      (req.headers[headers.correlationId] as string) ||
      (req.headers[headers.requestId] as string) ||
      randomUUID();

    const span = trace.getSpan(otelContext.active());
    const spanContext = span?.spanContext();
    const userId = options.resolveUserId?.(req);
    const tenantId = options.resolveTenantId?.(req);

    bindLogContext(
      {
        correlationId,
        requestId: correlationId,
        userId,
        tenantId,
      },
      () => {
        res.setHeader(headers.correlationId, correlationId);
        res.setHeader(headers.requestId, correlationId);
        if (spanContext?.traceId) {
          res.setHeader('x-trace-id', spanContext.traceId);
        }
        if (spanContext?.spanId) {
          res.setHeader('x-span-id', spanContext.spanId);
        }
        req.correlationId = correlationId;
        req.traceId = spanContext?.traceId;
        req.spanId = spanContext?.spanId;

        options.logger?.info({ correlationId }, 'request-context-initialized');
        next();
      },
    );
  };
}

export function setBackgroundContext(context: {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
}): void {
  setLogContext(context);
}
