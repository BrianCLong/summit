import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const TRACEPARENT_HEADER = 'traceparent';
const CORRELATION_ID_HEADER = 'x-correlation-id';
const TRACE_ID_REGEX = /^[0-9a-f]{32}$/i;

export function parseTraceparent(traceparent?: string | string[]): string | undefined {
  if (typeof traceparent !== 'string') {
    return undefined;
  }

  const [, traceId] = traceparent.split('-');

  if (!traceId || !TRACE_ID_REGEX.test(traceId)) {
    return undefined;
  }

  return traceId.toLowerCase();
}

export function generateTraceId(): string {
  return randomBytes(16).toString('hex');
}

export function traceContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inboundTraceId = parseTraceparent(req.headers[TRACEPARENT_HEADER]);
  const traceId = inboundTraceId ?? generateTraceId();

  (req as Request & { traceId: string }).traceId = traceId;

  res.setHeader(CORRELATION_ID_HEADER, traceId);

  next();
}
