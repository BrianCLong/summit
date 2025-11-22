/**
 * Centralized Logging Configuration with Winston
 * Provides structured logging with environment-based configuration
 *
 * Issue: #11813 - Structured Logging with ELK/OpenTelemetry
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Get log level based on environment
 */
function getLogLevel(): string {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel) return envLevel.toLowerCase();

  switch (process.env.NODE_ENV) {
    case 'production':
      return 'info';
    case 'development':
      return 'debug';
    case 'test':
      return 'warn';
    default:
      return 'info';
  }
}

/**
 * Custom format for structured logging with correlation context
 */
const correlationFormat = winston.format((info) => {
  const meta = info.metadata || {};
  return {
    ...info,
    correlationId: meta.correlationId || info.correlationId,
    traceId: meta.traceId || info.traceId,
    spanId: meta.spanId || info.spanId,
    userId: meta.userId || info.userId,
    tenantId: meta.tenantId || info.tenantId,
  };
});

/**
 * Main Winston logger instance
 */
const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({
      fillExcept: ['message', 'level', 'timestamp', 'label'],
    }),
    correlationFormat(),
    winston.format.json(),
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'intelgraph-server',
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? `\n${JSON.stringify(meta, null, 2)}`
            : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        }),
      ),
    }),
  );
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  context: Record<string, any>,
): winston.Logger {
  return logger.child(context);
}

/**
 * Performance logging helper
 */
export function perfLog(
  operation: string,
): (metadata?: Record<string, any>) => void {
  const start = Date.now();

  return (metadata?: Record<string, any>) => {
    const duration = Date.now() - start;
    logger.info(`${operation} completed`, {
      operation,
      duration_ms: duration,
      performance: true,
      ...metadata,
    });
  };
}

/**
 * Error logging with proper stack traces
 */
export function logError(
  message: string,
  error: Error | unknown,
  metadata?: Record<string, any>,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(message, {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    ...metadata,
  });
}

/**
 * Audit logging for security-sensitive operations
 */
export function auditLog(action: string, details: Record<string, any>): void {
  logger.info(`AUDIT: ${action}`, {
    audit: true,
    action,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Log with correlation context from request
 */
export function logWithContext(
  level: string,
  message: string,
  context?: {
    correlationId?: string;
    traceId?: string;
    spanId?: string;
    userId?: string;
    tenantId?: string;
  },
  metadata?: Record<string, any>,
): void {
  (logger as any)[level](message, {
    ...context,
    ...metadata,
  });
}

export default logger;
