// @ts-ignore
import pino from 'pino';
import { cfg } from '../config.js';

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

export const logger = (pino as any)({
  level: process.env.LOG_LEVEL || 'info',
  // Enforce structured JSON logging in all environments for consistency and to avoid missing dependency issues (pino-pretty).
  // This satisfies the requirement "All logs must be JSON structured".
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
});

export default logger;
