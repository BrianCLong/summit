/**
 * @intelgraph/logger
 *
 * Shared structured logging package for Summit platform
 *
 * Features:
 * - Structured JSON logging with Pino
 * - Automatic OpenTelemetry trace correlation
 * - Consistent log schema across all services
 * - Environment-aware formatting (pretty in dev, JSON in prod)
 * - Log redaction for sensitive fields
 */

import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';
import { trace, context, SpanContext } from '@opentelemetry/api';

export interface LoggerConfig {
  serviceName: string;
  level?: string;
  prettyPrint?: boolean;
  redact?: string[];
}

export interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Create a logger instance with OpenTelemetry correlation
 */
export function createLogger(config: LoggerConfig): PinoLogger {
  const {
    serviceName,
    level = process.env.LOG_LEVEL || 'info',
    prettyPrint = process.env.NODE_ENV !== 'production',
    redact = ['password', 'token', 'secret', 'apiKey', 'authorization']
  } = config;

  const baseConfig: LoggerOptions = {
    name: serviceName,
    level,
    // Standard fields for all logs
    base: {
      service: serviceName,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      hostname: process.env.HOSTNAME,
    },
    // Timestamp in ISO format
    timestamp: pino.stdTimeFunctions.isoTime,
    // Format level as uppercase string
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
      // Add OpenTelemetry context to every log
      bindings: (bindings) => {
        return {
          ...bindings,
          ...getTraceContext(),
        };
      },
    },
    // Redact sensitive fields
    redact: {
      paths: redact,
      remove: true,
    },
    // Serialize errors with stack traces
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  };

  // Use pretty printing in development
  const transport = prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          messageFormat: '{service} [{level}] {msg}',
          errorLikeObjectKeys: ['err', 'error'],
        },
      }
    : undefined;

  return pino({
    ...baseConfig,
    transport,
  });
}

/**
 * Extract OpenTelemetry trace context from active span
 */
function getTraceContext(): { traceId?: string; spanId?: string } {
  const activeSpan = trace.getActiveSpan();

  if (!activeSpan) {
    return {};
  }

  const spanContext = activeSpan.spanContext();

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  logger: PinoLogger,
  context: LogContext
): PinoLogger {
  return logger.child(context);
}

/**
 * Log middleware for Express/Fastify
 * Automatically adds request context to logs
 */
export function createLogMiddleware(logger: PinoLogger) {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || generateRequestId();
    const userId = req.user?.id;
    const tenantId = req.tenant?.id;

    // Attach child logger with request context
    req.log = logger.child({
      requestId,
      userId,
      tenantId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
    });

    // Log request start
    req.log.info('Request started');

    // Log request completion
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      req.log.info(
        {
          statusCode: res.statusCode,
          duration,
        },
        'Request completed'
      );
    });

    next();
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log levels enum for type safety
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Utility function to log with OpenTelemetry span attributes
 */
export function logWithSpan(
  logger: PinoLogger,
  level: LogLevel,
  message: string,
  attributes?: Record<string, any>
) {
  const activeSpan = trace.getActiveSpan();

  if (activeSpan && attributes) {
    activeSpan.setAttributes(attributes);
  }

  logger[level]({ ...attributes, ...getTraceContext() }, message);
}

/**
 * Default export: createLogger
 */
export default createLogger;
