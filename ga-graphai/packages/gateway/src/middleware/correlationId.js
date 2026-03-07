import { randomUUID } from "node:crypto";

export const correlationIdHeader = "x-correlation-id";

export function correlationIdMiddleware() {
  return (req, res, next) => {
    const headerValue = req.header(correlationIdHeader);
    const correlationId = headerValue?.trim() || randomUUID();

    req.correlationId = correlationId;
    res.locals.correlationId = correlationId;
    res.setHeader("X-Correlation-Id", correlationId);

    if (!req.aiContext) {
      req.aiContext = {};
    }
    req.aiContext.correlationId = correlationId;

    next();
  };
}
