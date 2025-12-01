/**
 * Structured Logging with Pino
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    service: 'websocket-server',
    nodeId: process.env.NODE_ID || 'unknown',
  },
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
