// @ts-ignore
import { default as pino } from 'pino';

/**
 * Global application logger configured with Pino.
 *
 * Features:
 * - JSON formatting for structured logging.
 * - Timestamp and error stack trace inclusion.
 * - Service name included in all logs.
 */
// @ts-ignore - pino types conflict with module resolution
const pinoLogger = (pino as any)({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'intelgraph-api' },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
});

export const logger = pinoLogger;
export type Logger = typeof pinoLogger;
export default pinoLogger;
