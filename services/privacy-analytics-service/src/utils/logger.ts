/**
 * Structured logging utility using Pino
 */

import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  name: 'privacy-analytics-service',
  level: isTest ? 'silent' : logLevel,
  transport: !isProduction && !isTest
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  base: {
    service: 'privacy-analytics-service',
    version: process.env.npm_package_version || '1.0.0',
  },
});

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(
  executionId: string,
  tenantId: string,
  userId: string
) {
  return logger.child({
    executionId,
    tenantId,
    userId,
  });
}

/**
 * Log privacy audit events
 */
export function logPrivacyAudit(
  executionId: string,
  event: string,
  details: Record<string, unknown>
) {
  logger.info({
    type: 'privacy_audit',
    executionId,
    event,
    ...details,
  });
}

/**
 * Log query execution metrics
 */
export function logQueryMetrics(
  executionId: string,
  metrics: {
    durationMs: number;
    rowCount: number;
    suppressedCount: number;
    policiesApplied: string[];
    status: string;
  }
) {
  logger.info({
    type: 'query_metrics',
    executionId,
    ...metrics,
  });
}
