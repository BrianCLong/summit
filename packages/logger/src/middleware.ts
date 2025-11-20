/**
 * Middleware integrations for Express and GraphQL
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { correlationStorage, LogContext, getLogger } from './index.js';
import { trace } from '@opentelemetry/api';

// Header constants
export const CORRELATION_HEADER = 'x-correlation-id';
export const TRACE_HEADER = 'x-trace-id';
export const SPAN_HEADER = 'x-span-id';
export const USER_HEADER = 'x-user-id';
export const REQUEST_HEADER = 'x-request-id';

/**
 * Express middleware options
 */
export interface CorrelationMiddlewareOptions {
  /** Generate new correlation ID if not present */
  generateIfMissing?: boolean;

  /** Set correlation headers in response */
  setResponseHeaders?: boolean;

  /** Log request start/end */
  logRequests?: boolean;

  /** Exclude paths from logging */
  excludePaths?: string[];

  /** Custom header names */
  headers?: {
    correlation?: string;
    trace?: string;
    span?: string;
    user?: string;
    request?: string;
  };
}

/**
 * Express middleware for correlation ID and logging context
 */
export function correlationMiddleware(
  options: CorrelationMiddlewareOptions = {}
) {
  const {
    generateIfMissing = true,
    setResponseHeaders = true,
    logRequests = true,
    excludePaths = ['/health', '/metrics', '/favicon.ico'],
    headers = {},
  } = options;

  const headerNames = {
    correlation: headers.correlation || CORRELATION_HEADER,
    trace: headers.trace || TRACE_HEADER,
    span: headers.span || SPAN_HEADER,
    user: headers.user || USER_HEADER,
    request: headers.request || REQUEST_HEADER,
  };

  const logger = getLogger();

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.includes(path))) {
      return next();
    }

    // Extract or generate IDs
    let correlationId = req.get(headerNames.correlation);
    if (!correlationId && generateIfMissing) {
      correlationId = uuidv4();
    }

    let traceId = req.get(headerNames.trace);
    let spanId = req.get(headerNames.span);

    // Try to get from OpenTelemetry if available
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (!traceId) traceId = spanContext.traceId;
      if (!spanId) spanId = spanContext.spanId;
    }

    // Generate if missing
    if (!traceId) traceId = uuidv4();
    if (!spanId) spanId = uuidv4();

    const requestId = req.get(headerNames.request) || uuidv4();
    const userId = req.get(headerNames.user) || (req as any).user?.id;

    // Create correlation context
    const context: LogContext = {
      correlationId,
      traceId,
      spanId,
      userId,
      requestId,
      sessionId: (req as any).sessionID,
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('User-Agent'),
    };

    // Set response headers
    if (setResponseHeaders && correlationId) {
      res.setHeader(headerNames.correlation, correlationId);
      res.setHeader(headerNames.trace, traceId);
      res.setHeader(headerNames.span, spanId);
      res.setHeader(headerNames.request, requestId);
    }

    // Attach to request for easy access
    (req as any).correlationId = correlationId;
    (req as any).traceId = traceId;
    (req as any).spanId = spanId;
    (req as any).requestId = requestId;
    (req as any).logContext = context;

    // Log request start
    if (logRequests) {
      logger.info('Request started', {
        correlationId,
        traceId,
        spanId,
        requestId,
        method: req.method,
        url: req.url,
        ip: context.ip,
        userId,
      });
    }

    // Track request timing
    const startTime = Date.now();

    // Wrap response methods to log completion
    const originalJson = res.json;
    const originalSend = res.send;

    const logCompletion = () => {
      if (logRequests && !res.headersSent) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

        logger.log(level, 'Request completed', {
          correlationId,
          traceId,
          spanId,
          requestId,
          method: req.method,
          url: req.url,
          statusCode,
          duration,
          userId,
        });
      }
    };

    res.json = function (data: any) {
      logCompletion();
      return originalJson.call(this, data);
    };

    res.send = function (data: any) {
      logCompletion();
      return originalSend.call(this, data);
    };

    // Run the rest of the request in correlation context
    correlationStorage.run(context, () => {
      next();
    });
  };
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware() {
  const logger = getLogger();

  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const context = correlationStorage.getStore() || {};

    logger.error('Request error', err, {
      ...context,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
    });

    next(err);
  };
}

/**
 * GraphQL plugin for correlation tracking
 */
export function createGraphQLLoggingPlugin() {
  const logger = getLogger();

  return {
    async requestDidStart(requestContext: any) {
      const { request, context } = requestContext;

      // Extract correlation context from HTTP request
      const httpContext = context?.req?.logContext || {};

      // Log GraphQL operation start
      logger.debug('GraphQL operation started', {
        ...httpContext,
        operationName: request.operationName,
        query: request.query?.substring(0, 500), // Limit query length
      });

      const startTime = Date.now();

      return {
        async didEncounterErrors(requestContext: any) {
          const { errors } = requestContext;

          logger.error('GraphQL operation errors', new Error('GraphQL errors'), {
            ...httpContext,
            operationName: request.operationName,
            errors: errors.map((e: any) => ({
              message: e.message,
              path: e.path,
              extensions: e.extensions,
            })),
          });
        },

        async willSendResponse(requestContext: any) {
          const duration = Date.now() - startTime;

          logger.info('GraphQL operation completed', {
            ...httpContext,
            operationName: request.operationName,
            duration,
            errors: requestContext.errors?.length || 0,
          });
        },
      };
    },
  };
}

/**
 * GraphQL resolver wrapper for automatic logging
 */
export function loggedResolver<TArgs = any, TContext = any, TResult = any>(
  resolverName: string,
  resolverFn: (
    parent: any,
    args: TArgs,
    context: TContext,
    info: any
  ) => Promise<TResult> | TResult
) {
  const logger = getLogger();

  return async (parent: any, args: TArgs, context: TContext, info: any) => {
    const startTime = Date.now();
    const contextData = correlationStorage.getStore() || {};

    logger.debug('GraphQL resolver started', {
      ...contextData,
      resolver: resolverName,
      fieldName: info.fieldName,
      parentType: info.parentType.name,
    });

    try {
      const result = await resolverFn(parent, args, context, info);
      const duration = Date.now() - startTime;

      logger.debug('GraphQL resolver completed', {
        ...contextData,
        resolver: resolverName,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('GraphQL resolver failed', error as Error, {
        ...contextData,
        resolver: resolverName,
        duration,
        args: JSON.stringify(args),
      });

      throw error;
    }
  };
}

/**
 * Database query logging wrapper
 */
export function loggedQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const logger = getLogger();
  const context = correlationStorage.getStore() || {};
  const startTime = Date.now();

  logger.debug('Database query started', {
    ...context,
    queryName,
  });

  return queryFn()
    .then(result => {
      const duration = Date.now() - startTime;

      logger.debug('Database query completed', {
        ...context,
        queryName,
        duration,
        rowCount: Array.isArray(result) ? result.length : undefined,
      });

      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;

      logger.error('Database query failed', error, {
        ...context,
        queryName,
        duration,
      });

      throw error;
    });
}

/**
 * HTTP client logging wrapper
 */
export async function loggedHttpRequest<T>(
  serviceName: string,
  method: string,
  url: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const logger = getLogger();
  const context = correlationStorage.getStore() || {};
  const startTime = Date.now();

  logger.debug('HTTP request started', {
    ...context,
    serviceName,
    method,
    url,
  });

  try {
    const result = await requestFn();
    const duration = Date.now() - startTime;

    logger.info('HTTP request completed', {
      ...context,
      serviceName,
      method,
      url,
      duration,
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('HTTP request failed', error, {
      ...context,
      serviceName,
      method,
      url,
      duration,
      statusCode: error.response?.status,
    });

    throw error;
  }
}

export default {
  correlationMiddleware,
  errorLoggingMiddleware,
  createGraphQLLoggingPlugin,
  loggedResolver,
  loggedQuery,
  loggedHttpRequest,
};
