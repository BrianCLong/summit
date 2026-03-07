import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

type CorrelationAugmentedRequest = {
  correlationId?: string;
  aiContext?: Record<string, unknown>;
};

type ResponseLocals = {
  correlationId?: string;
};

export const correlationIdHeader = "x-correlation-id";

export function correlationIdMiddleware(): RequestHandler {
  return (req, res, next) => {
    const augmentedReq = req as typeof req & CorrelationAugmentedRequest;
    const locals = res.locals as ResponseLocals;
    const headerValue = req.header(correlationIdHeader);
    const correlationId = headerValue?.trim() || randomUUID();

    augmentedReq.correlationId = correlationId;
    locals.correlationId = correlationId;
    res.setHeader("X-Correlation-Id", correlationId);

    if (!augmentedReq.aiContext) {
      augmentedReq.aiContext = {};
    }
    augmentedReq.aiContext.correlationId = correlationId;

    next();
  };
}
