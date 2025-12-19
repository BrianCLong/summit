// @ts-ignore
// @ts-nocheck
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
import { cfg } from '../config.js';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage for correlation ID propagation
export const correlationStorage = new AsyncLocalStorage<Map<string, string>>();

// Configuration for redaction of sensitive data
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-auth-token"]',
  'req.headers["x-api-key"]',
  'body.password',
  'body.token',
  'body.refreshToken',
  'body.secret',
  'password',
  'token',
  'secret',
  'user.email',
  'user.phone',
];

export interface SummitLogContext {
  correlationId?: string;
  tenantId?: string;
  principalId?: string;
  principalKind?: 'user' | 'api_key' | 'service_account' | 'system';
  service: string;
  subsystem?: string;
  requestId?: string;
  runId?: string;
  severity?: 'debug' | 'info' | 'warn' | 'error';
  message?: string;
  [key: string]: any;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'intelgraph-server',
    env: cfg.NODE_ENV,
    version: process.env.npm_package_version || 'unknown',
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  mixin(_context, level) {
    const store = correlationStorage.getStore();
    if (store) {
        return {
            correlationId: store.get('correlationId'),
            tenantId: store.get('tenantId'),
            principalId: store.get('principalId'),
            requestId: store.get('requestId'),
            traceId: store.get('traceId'),
        }
    }
    return {};
  },
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() };
    },
    bindings: (bindings: any) => {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
      };
    },
  },
  serializers: {
    // @ts-ignore
    err: (pino as any).stdSerializers?.err,
    // @ts-ignore
    req: (pino as any).stdSerializers?.req,
    // @ts-ignore
    res: (pino as any).stdSerializers?.res,
  },
  // Remove pino-pretty transport for production readiness
  // In production, logs should be structured JSON for log aggregation
}, stream);

export default logger;
