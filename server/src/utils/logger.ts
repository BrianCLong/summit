// @ts-ignore
import { default as pino } from 'pino';

// @ts-ignore - pino types conflict with module resolution
const pinoLogger = pino({
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
export default pinoLogger;
