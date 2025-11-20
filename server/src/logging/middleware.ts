import { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import * as uuid from 'uuid';
import { logger } from './logger';
import { context } from './context';

const uuidv4 = uuid.v4;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
      correlationId?: string;
    }
  }
}

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const logContext = context.create(req.headers);

  // Attach IDs to request for other middleware to use
  req.id = logContext.requestId;
  req.correlationId = logContext.correlationId;

  // Set response headers
  if (logContext.correlationId) {
    res.setHeader('x-correlation-id', logContext.correlationId);
  }
  if (logContext.traceId) {
    res.setHeader('x-trace-id', logContext.traceId);
  }

  // Run within context
  context.run(logContext, () => {
    next();
  });
};

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: any) => {
    // Use the ID from our context if available, otherwise generate new
    return req.id || req.correlationId || uuidv4();
  },
  customProps: (req: any, res: any) => {
    const currentContext = context.get();
    return {
      correlationId: currentContext?.correlationId,
      traceId: currentContext?.traceId,
      userId: currentContext?.userId,
    };
  },
  // Define a custom success message
  customSuccessMessage: (req: any, res: any) => {
    return `${req.method} ${req.url} completed`;
  },
  // Define a custom error message
  customErrorMessage: (req: any, res: any, err: any) => {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
  // Reduce log verbosity for health checks or specific paths if needed
  autoLogging: {
    ignore: (req: any) => {
      return req.url === '/health' || req.url === '/metrics';
    },
  },
});
