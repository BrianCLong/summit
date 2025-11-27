import pino from 'pino';
import { getCorrelationId } from '../middleware/correlationId.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin() {
    return { correlationId: getCorrelationId() };
  },
  browser: {
    asObject: true,
  },
  // Remove pino-pretty transport for production readiness
  // In production, logs should be structured JSON for log aggregation
});

export default logger;
