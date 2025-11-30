/**
 * Logger utility for Model Hub Service
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  name: 'model-hub-service',
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
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
  },
  base: {
    service: 'model-hub-service',
    version: process.env.npm_package_version || '1.0.0',
  },
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
