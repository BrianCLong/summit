import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { logEventBus, type LogLevel } from './logEventBus.js';
import { LogAlertEngine, defaultAlertRules } from './logAlertEngine.js';
import { scheduleRetention, type RetentionPolicy } from './logRetention.js';
import { formatLogEvent } from './logEventFormatter.js';
import { sanitizeLogArguments } from './logRedaction.js';
import { AuditLogPipeline } from './auditLogPipeline.js';
import { AuditLedger } from '../audit/ledger.js';

const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'app-structured.log');
const errorFile = path.join(logDir, 'app-error.log');

fs.mkdirSync(logDir, { recursive: true });

const transport = (pino as any).transport({
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

const baseLogger = (pino as any)(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: {
      service: process.env.SERVICE_NAME || 'summit-api',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version,
      hostname: process.env.HOSTNAME,
    },
    redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'ssn', 'card.number'],
    timestamp: (pino as any).stdTimeFunctions?.isoTime || (() => `,"time":"${new Date().toISOString()}"`),
    hooks: {
      logMethod(args: any[], method: any, level: any) {
        const safeArgs = sanitizeLogArguments(args);
        try {
          const event = formatLogEvent((level as LogLevel) || 'info', safeArgs);
          logEventBus.publish(event);
        } catch (error: any) {
          // Guard against serialization errors without breaking application logging.
          baseLogger.warn({ error }, 'Failed to mirror log event to bus');
        }

        method.apply(this, safeArgs);
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

const auditChainEnabled = process.env.AUDIT_CHAIN === 'true';
const auditLedger = auditChainEnabled
  ? new AuditLedger({
    ledgerFilePath: process.env.AUDIT_LEDGER_FILE,
    logger: baseLogger.child({ component: 'audit-ledger' }),
  })
  : null;

export const appLogger = baseLogger;
export const auditLogDashboard = auditPipeline;
export const stopLogAggregation = () => {
  detachAlertEngine();
  stopRetention();
  auditPipeline.stop();
  auditLedger?.stop();
  logEventBus.reset();
};
