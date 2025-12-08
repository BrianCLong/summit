import pino from 'pino';
import { config } from '../config.js';

const isDevelopment = config.nodeEnv !== 'production';

export const logger = pino({
  name: 'approvals-service',
  level: config.logLevel,
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
    service: 'approvals',
    version: process.env.npm_package_version || '1.0.0',
  },
});

export function createChildLogger(
  bindings: Record<string, unknown>,
): pino.Logger {
  return logger.child(bindings);
}
