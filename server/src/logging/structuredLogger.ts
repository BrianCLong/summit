import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { logEventBus, type LogLevel } from './logEventBus.js';
import { LogAlertEngine, defaultAlertRules } from './logAlertEngine.js';
import { scheduleRetention, type RetentionPolicy } from './logRetention.js';
import { formatLogEvent } from './logEventFormatter.js';

const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'app-structured.log');
const errorFile = path.join(logDir, 'app-error.log');

fs.mkdirSync(logDir, { recursive: true });

const transport = pino.transport({
  targets: [
    {
      level: process.env.LOG_LEVEL || 'info',
      target: 'pino/file',
      options: { destination: logFile, mkdir: true },
    },
    {
      level: 'error',
      target: 'pino/file',
      options: { destination: errorFile, mkdir: true },
    },
    {
      level: process.env.LOG_LEVEL || 'info',
      target: 'pino/file',
      options: { destination: 1 },
    },
  ],
});

const baseLogger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: {
      service: process.env.SERVICE_NAME || 'summit-api',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version,
      hostname: process.env.HOSTNAME,
    },
    redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'ssn', 'card.number'],
    timestamp: pino.stdTimeFunctions.isoTime,
    hooks: {
      logMethod(args, method, level) {
        try {
          const event = formatLogEvent((level as LogLevel) || 'info', args);
          logEventBus.publish(event);
        } catch (error) {
          // Guard against serialization errors without breaking application logging.
          baseLogger.warn({ error }, 'Failed to mirror log event to bus');
        }

        method.apply(this, args);
      },
    },
  },
  transport,
);

export const alertEngine = new LogAlertEngine([...defaultAlertRules]);
const detachAlertEngine = alertEngine.attach(logEventBus);

const retentionPolicy: RetentionPolicy = {
  directory: logDir,
  retentionDays: Number(process.env.LOG_RETENTION_DAYS ?? '30'),
  compressAfterDays: Number(process.env.LOG_COMPRESS_AFTER_DAYS ?? '3'),
  maxTotalSizeMb: Number(process.env.LOG_TOTAL_SIZE_MB ?? '2048'),
};

const stopRetention = scheduleRetention(retentionPolicy, baseLogger);

export const appLogger = baseLogger;
export const stopLogAggregation = () => {
  detachAlertEngine();
  stopRetention();
  logEventBus.reset();
};
