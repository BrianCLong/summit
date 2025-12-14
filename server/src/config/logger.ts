import pino from 'pino';
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

// Standard logging context
export interface SummitLogContext {
  correlationId?: string;
  tenantId?: string;
  principalId?: string;
  principalKind?: "user" | "api_key" | "service_account" | "system";
  service: string;
  subsystem?: string;
  requestId?: string;
  runId?: string;
  severity?: "debug" | "info" | "warn" | "error";
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
  timestamp: pino.stdTimeFunctions.isoTime,
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
    level: (label) => {
      return { level: label.toUpperCase() };
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
      };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

export default logger;
