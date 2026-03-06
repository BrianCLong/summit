/**
 * Centralized logging configuration
 * Exports a typed logger instance compatible with the Logger interface
 */
import pinoModule from 'pino';
import type { Logger } from './Logger.js';

// Workaround for pino import compatibility in ESM/CJS environments
const pino = (pinoModule as any).default || pinoModule;

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

// Export with proper typing
export const logger = pinoLogger as unknown as Logger;
export type { Logger };
