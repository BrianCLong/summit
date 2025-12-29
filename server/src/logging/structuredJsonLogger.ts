import pino, { type DestinationStream } from 'pino';
import { REQUIRED_LOG_FIELDS, StructuredLogLevel, StructuredLogSchema } from './schema.js';

const defaultDestination = pino.destination({ sync: false });

const levelFormatter = (label: string) => ({ level: label });

export interface StructuredLogger {
  log: (
    level: StructuredLogLevel,
    msg: string,
    context?: Partial<StructuredLogSchema> & Record<string, unknown>,
  ) => StructuredLogSchema;
  trace: (msg: string, context?: Record<string, unknown>) => StructuredLogSchema;
  debug: (msg: string, context?: Record<string, unknown>) => StructuredLogSchema;
  info: (msg: string, context?: Record<string, unknown>) => StructuredLogSchema;
  warn: (msg: string, context?: Record<string, unknown>) => StructuredLogSchema;
  error: (msg: string, context?: Record<string, unknown>) => StructuredLogSchema;
  fatal: (msg: string, context?: Record<string, unknown>) => StructuredLogSchema;
}

function normalizeContext(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) {
    return {};
  }

  const sanitized = { ...context } as Record<string, unknown>;
  for (const field of REQUIRED_LOG_FIELDS) {
    if (sanitized[field] === undefined) {
      delete sanitized[field];
    }
  }

  return sanitized;
}

export function createStructuredLogger(
  component: string,
  options?: { destination?: DestinationStream; defaultTenantId?: string },
): StructuredLogger {
  const destination = options?.destination ?? defaultDestination;
  const baseLogger = pino(
    {
      level: process.env.LOG_LEVEL ?? 'info',
      base: { component },
      timestamp: false,
      formatters: { level: levelFormatter },
    },
    destination,
  );

  const emit = (
    level: StructuredLogLevel,
    msg: string,
    context?: Partial<StructuredLogSchema> & Record<string, unknown>,
  ): StructuredLogSchema => {
    const timestamp = new Date().toISOString();
    const correlationId = (context?.correlationId as string) || 'unknown';
    const tenantId = (context?.tenantId as string | undefined) ?? options?.defaultTenantId;
    const normalizedContext = normalizeContext(context);

    const payload: StructuredLogSchema = {
      timestamp,
      level,
      msg,
      correlationId,
      tenantId,
      component,
      ...normalizedContext,
    };

    baseLogger[level](payload, msg);
    return payload;
  };

  return {
    log: emit,
    trace: (msg, context) => emit('trace', msg, context),
    debug: (msg, context) => emit('debug', msg, context),
    info: (msg, context) => emit('info', msg, context),
    warn: (msg, context) => emit('warn', msg, context),
    error: (msg, context) => emit('error', msg, context),
    fatal: (msg, context) => emit('fatal', msg, context),
  };
}
