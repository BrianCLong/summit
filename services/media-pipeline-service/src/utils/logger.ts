/**
 * Structured Logger for Media Pipeline Service
 */

import pino from 'pino';
import config from '../config/index.js';

const transport =
  config.nodeEnv === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

export const logger = pino({
  name: 'media-pipeline-service',
  level: config.logLevel,
  transport,
  base: {
    service: 'media-pipeline-service',
    env: config.nodeEnv,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
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
export function createRequestLogger(correlationId: string, additionalContext?: Record<string, unknown>) {
  return logger.child({
    correlationId,
    ...additionalContext,
  });
}

export default logger;
