import pino from 'pino';
import { correlationEngine } from '../lib/telemetry/correlation-engine';

// Custom stream that intercepts logs for the Correlation Engine and passes them to stdout
const stream = {
  write: (msg: string) => {
    // Optimization: avoid parsing JSON on every log line unless it looks like JSON
    // and we are actually running the correlation engine.
    if (msg.trim().startsWith('{')) {
        try {
          const logEntry = JSON.parse(msg);
          correlationEngine.ingestLog(logEntry);
        } catch (e) {
          // If parsing fails, ignore for correlation but still print
        }
    }
    process.stdout.write(msg);
  },
};

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
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
}, stream);

export default logger;
