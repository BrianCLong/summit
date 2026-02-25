import pino from 'pino';
import fs from 'fs';
import path from 'path';
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

let fileStream: fs.WriteStream | null = null;
if (process.env.LOG_FILE_PATH) {
  try {
    const logDir = path.dirname(process.env.LOG_FILE_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fileStream = fs.createWriteStream(process.env.LOG_FILE_PATH, { flags: 'a' });
  } catch (err) {
    console.error('Failed to create log file stream:', err);
  }
}

const stream = {
  write: (msg: string) => {
    if (msg.trim().startsWith('{')) {
      try {
        const logEntry = JSON.parse(msg);
        correlationEngine.ingestLog(logEntry);
      } catch (e: any) {}
    }
    process.stdout.write(msg);
    if (fileStream) {
      fileStream.write(msg);
    }
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
