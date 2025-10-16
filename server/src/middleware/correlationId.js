const { v4: uuidv4 } = require('uuid');
const { AsyncLocalStorage } = require('async_hooks');
const logger = require('../utils/logger');

/**
 * Correlation ID middleware for request tracing in Maestro Conductor
 * Provides request correlation across distributed services and async operations
 */

// Global async local storage for correlation context
const correlationStorage = new AsyncLocalStorage();

// Configuration
const CORRELATION_HEADER_NAME = 'x-correlation-id';
const TRACE_HEADER_NAME = 'x-trace-id';
const SPAN_HEADER_NAME = 'x-span-id';
const USER_HEADER_NAME = 'x-user-id';

/**
 * Express middleware to handle correlation ID for incoming requests
 */
function correlationIdMiddleware(options = {}) {
  const {
    headerName = CORRELATION_HEADER_NAME,
    generator = uuidv4,
    setResponseHeader = true,
    includeInLogs = true,
  } = options;

  return (req, res, next) => {
    // Extract or generate correlation ID
    let correlationId = req.headers[headerName.toLowerCase()];

    if (!correlationId) {
      correlationId = generator();
    }

    // Extract trace information
    const traceId = req.headers[TRACE_HEADER_NAME.toLowerCase()] || uuidv4();
    const spanId = req.headers[SPAN_HEADER_NAME.toLowerCase()] || uuidv4();
    const userId = req.headers[USER_HEADER_NAME.toLowerCase()] || req.user?.id;

    // Create correlation context
    const context = {
      correlationId,
      traceId,
      spanId,
      userId,
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
    };

    // Set response headers
    if (setResponseHeader) {
      res.set(headerName, correlationId);
      res.set(TRACE_HEADER_NAME, traceId);
      res.set(SPAN_HEADER_NAME, spanId);
    }

    // Attach to request object for easy access
    req.correlationId = correlationId;
    req.traceId = traceId;
    req.spanId = spanId;
    req.correlationContext = context;

    // Run the rest of the request in correlation context
    correlationStorage.run(context, () => {
      if (includeInLogs) {
        // Log request start
        logger.info('Request started', {
          correlationId,
          traceId,
          spanId,
          method: req.method,
          url: req.url,
          ip: context.ip,
          userId,
        });

        // Override response.json to log responses
        const originalJson = res.json;
        res.json = function (data) {
          const statusCode = res.statusCode;
          const isError = statusCode >= 400;

          logger[isError ? 'error' : 'info']('Request completed', {
            correlationId,
            traceId,
            spanId,
            method: req.method,
            url: req.url,
            statusCode,
            responseTime: Date.now() - new Date(context.timestamp).getTime(),
            userId,
          });

          return originalJson.call(this, data);
        };

        // Override response.send for non-JSON responses
        const originalSend = res.send;
        res.send = function (data) {
          const statusCode = res.statusCode;
          const isError = statusCode >= 400;

          logger[isError ? 'error' : 'info']('Request completed', {
            correlationId,
            traceId,
            spanId,
            method: req.method,
            url: req.url,
            statusCode,
            responseTime: Date.now() - new Date(context.timestamp).getTime(),
            userId,
          });

          return originalSend.call(this, data);
        };
      }

      next();
    });
  };
}

/**
 * Get the current correlation context
 */
function getCorrelationContext() {
  return correlationStorage.getStore() || {};
}

/**
 * Get the current correlation ID
 */
function getCorrelationId() {
  const context = getCorrelationContext();
  return context.correlationId;
}

/**
 * Get the current trace ID
 */
function getTraceId() {
  const context = getCorrelationContext();
  return context.traceId;
}

/**
 * Get the current span ID
 */
function getSpanId() {
  const context = getCorrelationContext();
  return context.spanId;
}

/**
 * Create a child span for nested operations
 */
function createChildSpan(operationName, parentSpanId = null) {
  const context = getCorrelationContext();
  const childSpanId = uuidv4();

  return {
    spanId: childSpanId,
    parentSpanId: parentSpanId || context.spanId,
    traceId: context.traceId,
    correlationId: context.correlationId,
    operationName,
    startTime: Date.now(),

    // Helper method to log span completion
    finish(additionalData = {}) {
      const duration = Date.now() - this.startTime;
      logger.info('Span completed', {
        correlationId: this.correlationId,
        traceId: this.traceId,
        spanId: this.spanId,
        parentSpanId: this.parentSpanId,
        operationName: this.operationName,
        duration,
        ...additionalData,
      });
    },

    // Helper method to log span error
    error(error, additionalData = {}) {
      const duration = Date.now() - this.startTime;
      logger.error('Span failed', {
        correlationId: this.correlationId,
        traceId: this.traceId,
        spanId: this.spanId,
        parentSpanId: this.parentSpanId,
        operationName: this.operationName,
        duration,
        error: error.message,
        stack: error.stack,
        ...additionalData,
      });
    },
  };
}

/**
 * Execute a function within a correlation context
 */
function withCorrelationContext(context, fn) {
  return correlationStorage.run(context, fn);
}

/**
 * Execute an async operation with span tracking
 */
async function traceAsyncOperation(
  operationName,
  asyncFn,
  additionalData = {},
) {
  const span = createChildSpan(operationName);

  try {
    logger.info('Starting async operation', {
      correlationId: span.correlationId,
      traceId: span.traceId,
      spanId: span.spanId,
      operationName,
      ...additionalData,
    });

    const result = await asyncFn(span);

    span.finish({ success: true, ...additionalData });
    return result;
  } catch (error) {
    span.error(error, additionalData);
    throw error;
  }
}

/**
 * Database query wrapper with correlation tracking
 */
function traceDbQuery(queryName, query, parameters = []) {
  return traceAsyncOperation(`db:${queryName}`, async (span) => {
    const startTime = Date.now();

    try {
      // Execute query (this would be your actual DB call)
      const result = await query(parameters);

      const duration = Date.now() - startTime;

      logger.debug('Database query executed', {
        correlationId: span.correlationId,
        traceId: span.traceId,
        spanId: span.spanId,
        queryName,
        duration,
        rowCount: result?.rows?.length || result?.length || 0,
      });

      return result;
    } catch (error) {
      logger.error('Database query failed', {
        correlationId: span.correlationId,
        traceId: span.traceId,
        spanId: span.spanId,
        queryName,
        error: error.message,
        parameters: parameters.length,
      });

      throw error;
    }
  });
}

/**
 * HTTP request wrapper with correlation tracking
 */
function traceHttpRequest(serviceName, method, url, options = {}) {
  return traceAsyncOperation(`http:${serviceName}`, async (span) => {
    const startTime = Date.now();

    // Add correlation headers to outgoing request
    const headers = {
      ...options.headers,
      [CORRELATION_HEADER_NAME]: span.correlationId,
      [TRACE_HEADER_NAME]: span.traceId,
      [SPAN_HEADER_NAME]: span.spanId,
    };

    try {
      // This would be your actual HTTP client call
      const response = await makeHttpRequest(method, url, {
        ...options,
        headers,
      });

      const duration = Date.now() - startTime;

      logger.info('HTTP request completed', {
        correlationId: span.correlationId,
        traceId: span.traceId,
        spanId: span.spanId,
        serviceName,
        method,
        url,
        statusCode: response.status,
        duration,
      });

      return response;
    } catch (error) {
      logger.error('HTTP request failed', {
        correlationId: span.correlationId,
        traceId: span.traceId,
        spanId: span.spanId,
        serviceName,
        method,
        url,
        error: error.message,
        duration: Date.now() - startTime,
      });

      throw error;
    }
  });
}

/**
 * GraphQL resolver wrapper with correlation tracking
 */
function traceGraphQLResolver(resolverName) {
  return (originalResolver) => {
    return async (parent, args, context, info) => {
      const span = createChildSpan(`graphql:${resolverName}`);

      try {
        logger.debug('GraphQL resolver started', {
          correlationId: span.correlationId,
          traceId: span.traceId,
          spanId: span.spanId,
          resolverName,
          fieldName: info.fieldName,
          parentType: info.parentType.name,
        });

        const result = await originalResolver(parent, args, context, info);

        span.finish({
          resolverName,
          fieldName: info.fieldName,
          success: true,
        });

        return result;
      } catch (error) {
        span.error(error, {
          resolverName,
          fieldName: info.fieldName,
          args: JSON.stringify(args),
        });

        throw error;
      }
    };
  };
}

/**
 * Utility function to add correlation context to any logger call
 */
function enrichLoggerWithContext(loggerInstance) {
  const originalMethods = {
    debug: loggerInstance.debug.bind(loggerInstance),
    info: loggerInstance.info.bind(loggerInstance),
    warn: loggerInstance.warn.bind(loggerInstance),
    error: loggerInstance.error.bind(loggerInstance),
  };

  ['debug', 'info', 'warn', 'error'].forEach((level) => {
    loggerInstance[level] = (message, meta = {}) => {
      const context = getCorrelationContext();
      const enrichedMeta = {
        ...meta,
        correlationId: context.correlationId,
        traceId: context.traceId,
        spanId: context.spanId,
        userId: context.userId,
      };

      return originalMethods[level](message, enrichedMeta);
    };
  });

  return loggerInstance;
}

/**
 * Placeholder HTTP request function (would be replaced with actual implementation)
 */
async function makeHttpRequest(method, url, options) {
  // This would be replaced with your actual HTTP client (axios, fetch, etc.)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ status: 200, data: {} });
    }, 100);
  });
}

module.exports = {
  correlationIdMiddleware,
  getCorrelationContext,
  getCorrelationId,
  getTraceId,
  getSpanId,
  createChildSpan,
  withCorrelationContext,
  traceAsyncOperation,
  traceDbQuery,
  traceHttpRequest,
  traceGraphQLResolver,
  enrichLoggerWithContext,

  // Constants
  CORRELATION_HEADER_NAME,
  TRACE_HEADER_NAME,
  SPAN_HEADER_NAME,
  USER_HEADER_NAME,
};
