/**
 * IntelGraph Standardized Logging Package
 *
 * Provides structured logging with:
 * - Correlation ID tracking across distributed services
 * - OpenTelemetry integration
 * - Loki log aggregation support
 * - Configurable log levels and outputs
 * - Performance-optimized for production use
 */

import winston from 'winston';
import LokiTransport from 'winston-loki';
import DailyRotateFile from 'winston-daily-rotate-file';
import { AsyncLocalStorage } from 'async_hooks';
import { trace, context as otelContext, Span } from '@opentelemetry/api';

// Re-export types for consumers
export { Logger, LoggerOptions } from 'winston';

/**
 * Log levels following RFC 5424
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

/**
 * Logging context interface
 */
export interface LogContext {
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  tenantId?: string;
  [key: string]: any;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Service name for log identification */
  serviceName: string;

  /** Minimum log level */
  level?: LogLevel | string;

  /** Environment (development, staging, production) */
  environment?: string;

  /** Enable console logging */
  console?: boolean;

  /** Enable file logging */
  file?: boolean;

  /** File log directory */
  logDir?: string;

  /** Enable Loki integration */
  loki?: boolean;

  /** Loki server URL */
  lokiUrl?: string;

  /** Enable JSON format */
  json?: boolean;

  /** Enable colorized output (console only) */
  colorize?: boolean;

  /** Additional static metadata */
  defaultMeta?: Record<string, any>;

  /** Max log file size */
  maxFileSize?: string;

  /** Max number of log files */
  maxFiles?: string;

  /** Log retention days */
  retentionDays?: number;
}

/**
 * Correlation context storage using AsyncLocalStorage
 */
export const correlationStorage = new AsyncLocalStorage<LogContext>();

/**
 * Get current correlation context
 */
export function getCorrelationContext(): LogContext {
  return correlationStorage.getStore() || {};
}

/**
 * Get current correlation ID
 */
export function getCorrelationId(): string | undefined {
  return getCorrelationContext().correlationId;
}

/**
 * Get current trace ID from OpenTelemetry or context
 */
export function getTraceId(): string | undefined {
  const context = getCorrelationContext();
  if (context.traceId) {
    return context.traceId;
  }

  // Try to get from OpenTelemetry active span
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    return spanContext.traceId;
  }

  return undefined;
}

/**
 * Get current span ID from OpenTelemetry or context
 */
export function getSpanId(): string | undefined {
  const context = getCorrelationContext();
  if (context.spanId) {
    return context.spanId;
  }

  // Try to get from OpenTelemetry active span
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    return spanContext.spanId;
  }

  return undefined;
}

/**
 * Format that enriches logs with correlation context
 */
const correlationFormat = winston.format((info) => {
  const context = getCorrelationContext();

  return {
    ...info,
    correlationId: info.correlationId || context.correlationId,
    traceId: info.traceId || getTraceId(),
    spanId: info.spanId || getSpanId(),
    userId: info.userId || context.userId,
    requestId: info.requestId || context.requestId,
    sessionId: info.sessionId || context.sessionId,
    tenantId: info.tenantId || context.tenantId,
  };
});

/**
 * Format for sanitizing sensitive data
 */
const sanitizeFormat = winston.format((info) => {
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'];

  const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in sanitized) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitize(sanitized[key]);
      }
    }

    return sanitized;
  };

  return sanitize(info);
});

/**
 * Create a logger instance with standardized configuration
 */
export function createLogger(config: LoggerConfig): winston.Logger {
  const {
    serviceName,
    level = process.env.LOG_LEVEL || LogLevel.INFO,
    environment = process.env.NODE_ENV || 'development',
    console: enableConsole = true,
    file: enableFile = environment === 'production',
    logDir = process.env.LOG_DIR || 'logs',
    loki: enableLoki = process.env.LOKI_ENABLED === 'true',
    lokiUrl = process.env.LOKI_URL || 'http://loki:3100',
    json = environment === 'production',
    colorize = environment !== 'production',
    defaultMeta = {},
    maxFileSize = '100m',
    maxFiles = '30d',
    retentionDays = 30,
  } = config;

  const transports: winston.transport[] = [];

  // Console transport
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          colorize ? winston.format.colorize() : winston.format.uncolorize(),
          json
            ? winston.format.json()
            : winston.format.printf(
                ({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length
                    ? `\n${JSON.stringify(meta, null, 2)}`
                    : '';
                  return `${timestamp} [${level}] ${message}${metaStr}`;
                }
              )
        ),
      })
    );
  }

  // File transport with rotation
  if (enableFile) {
    // Error logs
    transports.push(
      new DailyRotateFile({
        filename: `${logDir}/${serviceName}-error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: maxFileSize,
        maxFiles: maxFiles,
        zippedArchive: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    // Combined logs
    transports.push(
      new DailyRotateFile({
        filename: `${logDir}/${serviceName}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: maxFileSize,
        maxFiles: maxFiles,
        zippedArchive: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  // Loki transport for log aggregation
  if (enableLoki) {
    transports.push(
      new LokiTransport({
        host: lokiUrl,
        labels: {
          service: serviceName,
          environment,
        },
        json: true,
        format: winston.format.json(),
        replaceTimestamp: true,
        onConnectionError: (err) => {
          console.error('Loki connection error:', err);
        },
      })
    );
  }

  const logger = winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      sanitizeFormat(),
      correlationFormat(),
      winston.format.json()
    ),
    defaultMeta: {
      service: serviceName,
      environment,
      ...defaultMeta,
    },
    transports,
    exitOnError: false,
  });

  return logger;
}

/**
 * Default logger instance
 */
let defaultLogger: winston.Logger | null = null;

/**
 * Initialize the default logger
 */
export function initializeLogger(config: LoggerConfig): winston.Logger {
  defaultLogger = createLogger(config);
  return defaultLogger;
}

/**
 * Get the default logger instance
 */
export function getLogger(): winston.Logger {
  if (!defaultLogger) {
    // Create a minimal logger if not initialized
    defaultLogger = createLogger({
      serviceName: 'intelgraph',
      console: true,
      file: false,
      loki: false,
    });
  }
  return defaultLogger;
}

/**
 * Structured logging helpers
 */
export class StructuredLogger {
  constructor(private logger: winston.Logger = getLogger()) {}

  /**
   * Log with structured context
   */
  log(level: LogLevel, message: string, context?: Record<string, any>) {
    this.logger.log(level, message, context);
  }

  /**
   * Log an error with full context
   */
  error(message: string, error?: Error, context?: Record<string, any>) {
    this.logger.error(message, {
      error: error?.message,
      stack: error?.stack,
      ...context,
    });
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: Record<string, any>) {
    this.logger.warn(message, context);
  }

  /**
   * Log info
   */
  info(message: string, context?: Record<string, any>) {
    this.logger.info(message, context);
  }

  /**
   * Log HTTP request
   */
  http(message: string, context?: Record<string, any>) {
    this.logger.http(message, context);
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: Record<string, any>) {
    this.logger.debug(message, context);
  }

  /**
   * Log database query
   */
  logQuery(
    queryName: string,
    duration: number,
    success: boolean,
    context?: Record<string, any>
  ) {
    this.logger.info('Database query executed', {
      queryName,
      duration,
      success,
      ...context,
    });
  }

  /**
   * Log HTTP request/response
   */
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>
  ) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.logger.log(level, 'HTTP request completed', {
      method,
      url,
      statusCode,
      duration,
      ...context,
    });
  }

  /**
   * Log service call
   */
  logServiceCall(
    serviceName: string,
    operation: string,
    duration: number,
    success: boolean,
    context?: Record<string, any>
  ) {
    this.logger.info('Service call completed', {
      serviceName,
      operation,
      duration,
      success,
      ...context,
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(
    operation: string,
    duration: number,
    context?: Record<string, any>
  ) {
    this.logger.info('Performance metric', {
      operation,
      duration,
      ...context,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Record<string, any>
  ) {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logger.log(level, 'Security event', {
      eventType,
      severity,
      ...context,
    });
  }

  /**
   * Log audit event
   */
  logAudit(
    action: string,
    resource: string,
    userId: string,
    success: boolean,
    context?: Record<string, any>
  ) {
    this.logger.info('Audit event', {
      action,
      resource,
      userId,
      success,
      ...context,
    });
  }
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  parentLogger: winston.Logger,
  childMeta: Record<string, any>
): winston.Logger {
  return parentLogger.child(childMeta);
}

/**
 * Execute function within correlation context
 */
export function withCorrelationContext<T>(
  context: LogContext,
  fn: () => T
): T {
  return correlationStorage.run(context, fn);
}

/**
 * Execute async function within correlation context
 */
export async function withCorrelationContextAsync<T>(
  context: LogContext,
  fn: () => Promise<T>
): Promise<T> {
  return correlationStorage.run(context, fn);
}

/**
 * Export default structured logger instance
 */
export const logger = new StructuredLogger();

/**
 * Re-export for convenience
 */
export default {
  createLogger,
  initializeLogger,
  getLogger,
  logger,
  StructuredLogger,
  LogLevel,
  getCorrelationContext,
  getCorrelationId,
  getTraceId,
  getSpanId,
  withCorrelationContext,
  withCorrelationContextAsync,
  createChildLogger,
};
