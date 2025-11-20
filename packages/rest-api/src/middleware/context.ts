/**
 * Request Context Middleware
 *
 * Adds context information to each request
 */

import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction, RequestContext } from '../types';

export function contextMiddleware(options?: {
  requestIdHeader?: string;
  traceIdHeader?: string;
}) {
  const requestIdHeader = options?.requestIdHeader || 'x-request-id';
  const traceIdHeader = options?.traceIdHeader || 'x-trace-id';

  return (req: Request, res: Response, next: NextFunction) => {
    // Generate or extract request ID
    const requestId = (req.headers[requestIdHeader] as string) || uuidv4();

    // Generate or extract trace ID
    const traceId = (req.headers[traceIdHeader] as string) || uuidv4();

    // Create context
    const context: RequestContext = {
      requestId,
      traceId,
      startTime: Date.now(),
      spanId: uuidv4(),
    };

    // Attach to request
    req.context = context;

    // Add headers to response
    res.setHeader(requestIdHeader, requestId);
    res.setHeader(traceIdHeader, traceId);

    next();
  };
}
