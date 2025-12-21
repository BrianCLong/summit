// @ts-nocheck
import fs from 'fs';
import path from 'path';
import pino from 'pino';

import { createLogger, type StructuredLogger } from '@intelgraph/logging';

import { logEventBus, type LogLevel } from './logEventBus.js';
import { LogAlertEngine, defaultAlertRules } from './logAlertEngine.js';
import { scheduleRetention, type RetentionPolicy } from './logRetention.js';
import { formatLogEvent } from './logEventFormatter.js';
import { AuditLogPipeline } from './auditLogPipeline.js';

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

let mirrorLogger: StructuredLogger;

const baseLogger = createLogger({
  transport,
  serviceName: process.env.SERVICE_NAME || 'summit-api',
  environment: process.env.NODE_ENV || 'development',
  level: process.env.LOG_LEVEL || 'info',
  redactKeys: ['ssn', 'card.number'],
  sampleRates: {
    debug: Number(process.env.LOG_DEBUG_SAMPLE_RATE ?? '1') as number,
  },
  onLog(level, args) {
    try {
      const event = formatLogEvent((level as LogLevel) || 'info', args);
      logEventBus.publish(event);
    } catch (error) {
      mirrorLogger?.warn({ error }, 'Failed to mirror log event to bus');
    }
  },
});

mirrorLogger = baseLogger;

export const alertEngine = new LogAlertEngine([...defaultAlertRules]);
const detachAlertEngine = alertEngine.attach(logEventBus);

const retentionPolicy: RetentionPolicy = {
  directory: logDir,
  retentionDays: Number(process.env.LOG_RETENTION_DAYS ?? '30'),
  compressAfterDays: Number(process.env.LOG_COMPRESS_AFTER_DAYS ?? '3'),
  maxTotalSizeMb: Number(process.env.LOG_TOTAL_SIZE_MB ?? '2048'),
};

const stopRetention = scheduleRetention(retentionPolicy, baseLogger);

const auditPipeline = new AuditLogPipeline({
  logDir: process.env.AUDIT_LOG_DIR || path.join(logDir, 'audit'),
  streamName: process.env.AUDIT_LOG_STREAM || 'audit-log',
  alertEngine,
  logger: baseLogger.child({ component: 'audit-log-pipeline' }),
  retentionPolicy: {
    directory: process.env.AUDIT_LOG_DIR || path.join(logDir, 'audit'),
    retentionDays: Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? '365'),
    compressAfterDays: Number(process.env.AUDIT_LOG_COMPRESS_AFTER_DAYS ?? '7'),
    maxTotalSizeMb: Number(process.env.AUDIT_LOG_TOTAL_SIZE_MB ?? '4096'),
  },
});

export const appLogger = baseLogger;
export const auditLogDashboard = auditPipeline;
export const stopLogAggregation = () => {
  detachAlertEngine();
  stopRetention();
  auditPipeline.stop();
  logEventBus.reset();
};
