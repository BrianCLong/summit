/**
 * @intelgraph/logger
 *
 * Shared structured logging package for Summit platform
 *
 * Features:
 * - Structured JSON logging with Pino
 * - Automatic OpenTelemetry trace correlation
 * - Consistent log schema across all services
 * - Environment-aware formatting (pretty in dev, JSON in prod)
 * - Log redaction for sensitive fields
 */

import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';
import { trace } from '@opentelemetry/api';

const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apikey',
  'authorization',
  'accesstoken',
  'refreshtoken',
  'clientsecret',
  'privatekey',
  'key',
  'signingkey',
];

const BEARER_TOKEN_REGEX = /(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi;
const KEY_VALUE_REGEX =
  /\b(access_token|refresh_token|token|api[-_]?key|secret|authorization)=([^\s&]+)/gi;

function scrubString(value: string): string {
  const bearerSanitized = value.replace(BEARER_TOKEN_REGEX, '$1[REDACTED]');
  return bearerSanitized.replace(KEY_VALUE_REGEX, '$1=[REDACTED]');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function scrubValue(value: unknown, sensitiveKeys: Set<string>): unknown {
  if (typeof value === 'string') {
    return scrubString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => scrubValue(entry, sensitiveKeys));
  }

  if (isPlainObject(value)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      sanitized[key] = scrubValue(entry, sensitiveKeys);
    }
    return sanitized;
  }

  return value;
}

export function scrubLogArgs(
  args: unknown[],
  extraSensitiveFields: string[] = [],
): unknown[] {
  const sensitiveKeys = new Set(
    [...DEFAULT_SENSITIVE_FIELDS, ...extraSensitiveFields].map((key) =>
      key.toLowerCase(),
    ),
  );
  return args.map((arg) => scrubValue(arg, sensitiveKeys));
}

export interface LoggerConfig {
  serviceName: string;
  level?: string;
  prettyPrint?: boolean;
  redact?: string[];
}

export interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Create a logger instance with OpenTelemetry correlation
 */
export function createLogger(config: LoggerConfig): PinoLogger {
  const {
    serviceName,
    level = process.env.LOG_LEVEL || 'info',
    prettyPrint = process.env.NODE_ENV !== 'production',
    redact = ['password', 'token', 'secret', 'apiKey', 'authorization'],
  } = config;

  const redactPaths = Array.from(
    new Set([
      ...DEFAULT_SENSITIVE_FIELDS,
      'headers.authorization',
      'headers.cookie',
      ...redact,
    ]),
  );

  const baseConfig: LoggerOptions = {
    name: serviceName,
    level,
    // Standard fields for all logs
    base: {
      service: serviceName,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      hostname: process.env.HOSTNAME,
    },
    // Timestamp in ISO format
    timestamp: pino.stdTimeFunctions.isoTime,
    // Format level as uppercase string
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
      // Add OpenTelemetry context to every log
      bindings: (bindings) => {
        return {
          ...bindings,
          ...getTraceContext(),
        };
      },
    },
    // Redact sensitive fields
    redact: {
      paths: redactPaths,
      remove: true,
    },
    // Serialize errors with stack traces
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    hooks: {
      logMethod(args, method) {
        const sanitized = scrubLogArgs(args as unknown[], redactPaths);
        method.apply(this, sanitized as any);
      },
    },
  };

  // Use pretty printing in development
  const transport = prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          messageFormat: '{service} [{level}] {msg}',
          errorLikeObjectKeys: ['err', 'error'],
        },
      }
    : undefined;

  return pino({
    ...baseConfig,
    transport,
  });
}

/**
 * Extract OpenTelemetry trace context from active span
 */
function getTraceContext(): { traceId?: string; spanId?: string } {
  const activeSpan = trace.getActiveSpan();

  if (!activeSpan) {
    return {};
  }

  const spanContext = activeSpan.spanContext();

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  logger: PinoLogger,
  context: LogContext
): PinoLogger {
  return logger.child(context);
}

/**
 * Log middleware for Express/Fastify
 * Automatically adds request context to logs
 */
export function createLogMiddleware(logger: PinoLogger) {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || generateRequestId();
    const userId = req.user?.id;
    const tenantId = req.tenant?.id;

    // Attach child logger with request context
    req.log = logger.child({
      requestId,
      userId,
      tenantId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
    });

    // Log request start
    req.log.info('Request started');

    // Log request completion
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      req.log.info(
        {
          statusCode: res.statusCode,
          duration,
        },
        'Request completed'
      );
    });

    next();
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log levels enum for type safety
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Utility function to log with OpenTelemetry span attributes
 */
export function logWithSpan(
  logger: PinoLogger,
  level: LogLevel,
  message: string,
  attributes?: Record<string, any>
) {
  const activeSpan = trace.getActiveSpan();

  if (activeSpan && attributes) {
    activeSpan.setAttributes(attributes);
  }

  logger[level]({ ...attributes, ...getTraceContext() }, message);
}

/**
 * Default export: createLogger
 */
export default createLogger;
