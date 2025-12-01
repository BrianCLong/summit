import { AsyncLocalStorage } from 'node:async_hooks';
import { trace } from '@opentelemetry/api';
import pino, { LoggerOptions } from 'pino';

export type LogContext = {
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;
};

const logContext = new AsyncLocalStorage<LogContext>();

const redactionPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'password',
  'token',
  'refreshToken',
  'clientSecret',
  'secret',
  'ssn',
  'card.number',
  'creditCard',
  'email',
];

const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  redact: {
    paths: redactionPaths,
    remove: true,
  },
  mixin() {
    const span = trace.getActiveSpan();
    const spanContext = span?.spanContext();
    const context = logContext.getStore() || {};

    return {
      correlationId: context.correlationId,
      traceId: spanContext?.traceId || context.traceId,
      spanId: spanContext?.spanId || context.spanId,
      userId: context.userId,
      tenantId: context.tenantId,
    };
  },
};

export const logger = pino(loggerOptions);

export function withLogContext<T>(context: LogContext, fn: () => T): T {
  const merged = { ...logContext.getStore(), ...context };
  return logContext.run(merged, fn);
}

export function setLogContext(context: LogContext): void {
  const merged = { ...logContext.getStore(), ...context };
  logContext.enterWith(merged);
}

export function getLogContext(): LogContext {
  return logContext.getStore() || {};
}

export default logger;
