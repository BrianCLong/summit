/**
 * Logger utility for ESG Reporting Service
 * Uses Pino for structured logging
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  name: 'esg-reporting-service',
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'esg-reporting-service',
    version: process.env.npm_package_version || '1.0.0',
  },
});

export type Logger = typeof logger;

export function createChildLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}
