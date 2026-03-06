import pino from 'pino';
import { cfg } from '../config.js';
import { AsyncLocalStorage } from 'async_hooks';
import { correlationEngine } from '../lib/telemetry/correlation-engine.js';

// AsyncLocalStorage for correlation ID propagation
export const correlationStorage = new AsyncLocalStorage<Map<string, string>>();

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

const stream = {
  write: (msg: string) => {
    if (msg.trim().startsWith('{')) {
      try {
        const logEntry = JSON.parse(msg);
        correlationEngine.ingestLog(logEntry);
      } catch (e: any) {}
    }
    process.stdout.write(msg);
  },
};

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
  mixin() {
    const store = correlationStorage.getStore();
    if (store) {
      return {
        correlationId: store.get('correlationId'),
        tenantId: store.get('tenantId'),
        principalId: store.get('principalId'),
        requestId: store.get('requestId'),
        traceId: store.get('traceId'),
        role: store.get('role'),
      };
    }
    return {};
  },
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
    bindings: (bindings: any) => ({
      pid: bindings.pid,
      host: bindings.hostname,
    }),
  },
}, stream);

export default logger;