import pino from 'pino';
import { configService } from './ConfigService.js';

const logger = pino({
  level: configService.get('app').logLevel,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  browser: {
    asObject: true,
  },
  // Remove pino-pretty transport for production readiness
  // In production, logs should be structured JSON for log aggregation
});

export default logger;
