// @ts-ignore
import { default as pino } from 'pino';

<<<<<<< HEAD
// @ts-ignore - pino types conflict with module resolution
const pinoLogger = pino({
=======
/**
 * Global application logger configured with Winston.
 *
 * Features:
 * - JSON formatting for structured logging.
 * - Timestamp and error stack trace inclusion.
 * - Console transport for non-production environments.
 * - File transports for errors and combined logs.
 */
const logger = winston.createLogger({
>>>>>>> main
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'intelgraph-api' },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

export const logger = pinoLogger;
export default pinoLogger;
