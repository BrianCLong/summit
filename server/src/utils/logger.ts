import { default as pino } from 'pino';

/**
 * Global application logger configured with Pino.
 *
 * Features:
 * - JSON formatting for structured logging.
 * - Timestamp inclusion.
 * - Optimized for performance.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'intelgraph-api' },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

export { logger };
export default logger;
