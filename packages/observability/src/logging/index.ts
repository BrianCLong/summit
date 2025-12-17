/**
 * CompanyOS Observability SDK - Logging Module
 *
 * Provides structured logging with automatic trace correlation,
 * PII redaction, and consistent log schema across all services.
 */

import pino, { Logger as PinoLogger, LoggerOptions, Level } from 'pino';
import { trace, context } from '@opentelemetry/api';
import type { ServiceConfig, LogLevel, LogContext, AuditEvent, REDACTED_FIELDS } from '../types/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface LoggingConfig {
  service: ServiceConfig;
  /** Minimum log level */
  level?: LogLevel;
  /** Enable pretty printing (development only) */
  prettyPrint?: boolean;
  /** Additional fields to redact */
  redactFields?: string[];
  /** Enable trace correlation */
  traceCorrelation?: boolean;
  /** Custom serializers */
  serializers?: Record<string, (value: unknown) => unknown>;
}

/** Default redacted fields */
const DEFAULT_REDACTED_FIELDS: readonly string[] = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'sessionId',
  'session_id',
  'creditCard',
  'credit_card',
  'ssn',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
];

// =============================================================================
// LOGGER FACTORY
// =============================================================================

/**
 * Create a configured logger instance for a service
 */
export function createLogger(config: LoggingConfig): PinoLogger {
  const {
    service,
    level = (process.env.LOG_LEVEL as LogLevel) || 'info',
    prettyPrint = process.env.NODE_ENV !== 'production',
    redactFields = [],
    traceCorrelation = true,
    serializers = {},
  } = config;

  const allRedactedFields = [...DEFAULT_REDACTED_FIELDS, ...redactFields];

  const baseConfig: LoggerOptions = {
    name: service.name,
    level,
    base: {
      service: service.name,
      environment: service.environment,
      version: service.version,
      team: service.team,
      tier: service.tier,
      pid: process.pid,
      hostname: process.env.HOSTNAME || process.env.HOST,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label.toUpperCase() }),
      bindings: (bindings: Record<string, unknown>) => {
        const traceContext = traceCorrelation ? getTraceContext() : {};
        return { ...bindings, ...traceContext };
      },
    },
    redact: {
      paths: allRedactedFields.flatMap((field) => [
        field,
        `*.${field}`,
        `*.*.${field}`,
        `body.${field}`,
        `headers.${field}`,
        `query.${field}`,
      ]),
      remove: true,
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: serializeRequest,
      res: serializeResponse,
      ...serializers,
    },
  };

  // Pretty printing for development
  const transport = prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '[{service}] {msg}',
          errorLikeObjectKeys: ['err', 'error'],
        },
      }
    : undefined;

  return pino({ ...baseConfig, transport });
}

// =============================================================================
// TRACE CORRELATION
// =============================================================================

/**
 * Extract OpenTelemetry trace context from the active span
 */
function getTraceContext(): { traceId?: string; spanId?: string; traceFlags?: number } {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) {
    return {};
  }

  const spanContext = activeSpan.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
  };
}

/**
 * Create a child logger with trace context
 */
export function withTraceContext(logger: PinoLogger): PinoLogger {
  const traceContext = getTraceContext();
  if (!traceContext.traceId) {
    return logger;
  }
  return logger.child(traceContext);
}

// =============================================================================
// REQUEST/RESPONSE SERIALIZERS
// =============================================================================

interface SerializedRequest {
  id?: string;
  method: string;
  url: string;
  path?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  remoteAddress?: string;
  remotePort?: number;
}

function serializeRequest(req: any): SerializedRequest {
  return {
    id: req.id || req.headers?.['x-request-id'],
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.headers?.['user-agent'],
      'content-type': req.headers?.['content-type'],
      'content-length': req.headers?.['content-length'],
      'x-request-id': req.headers?.['x-request-id'],
      'x-forwarded-for': req.headers?.['x-forwarded-for'],
    },
    remoteAddress: req.socket?.remoteAddress || req.ip,
    remotePort: req.socket?.remotePort,
  };
}

interface SerializedResponse {
  statusCode: number;
  headers?: Record<string, string>;
}

function serializeResponse(res: any): SerializedResponse {
  return {
    statusCode: res.statusCode,
    headers: {
      'content-type': res.getHeader?.('content-type'),
      'content-length': res.getHeader?.('content-length'),
    },
  };
}

// =============================================================================
// CHILD LOGGER FACTORY
// =============================================================================

/**
 * Create a child logger with request context
 */
export function createRequestLogger(
  logger: PinoLogger,
  context: LogContext
): PinoLogger {
  return logger.child({
    ...context,
    ...getTraceContext(),
  });
}

/**
 * Create a child logger for a specific operation
 */
export function createOperationLogger(
  logger: PinoLogger,
  operation: string,
  metadata?: Record<string, unknown>
): PinoLogger {
  return logger.child({
    operation,
    ...metadata,
    ...getTraceContext(),
  });
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Create an audit logger for security-relevant events
 */
export function createAuditLogger(baseLogger: PinoLogger): AuditLogger {
  const auditLogger = baseLogger.child({ audit: true });
  return new AuditLogger(auditLogger);
}

export class AuditLogger {
  constructor(private logger: PinoLogger) {}

  /**
   * Log an authentication event
   */
  logAuth(
    action: 'login' | 'logout' | 'token_refresh' | 'password_change' | 'mfa_challenge',
    actor: AuditEvent['actor'],
    outcome: AuditEvent['outcome'],
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      type: 'auth',
      action,
      actor,
      resource: { type: 'session', id: 'current' },
      outcome,
      metadata,
    });
  }

  /**
   * Log a resource access event
   */
  logAccess(
    action: 'read' | 'list' | 'search' | 'export',
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    outcome: AuditEvent['outcome'],
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      type: 'access',
      action,
      actor,
      resource,
      outcome,
      metadata,
    });
  }

  /**
   * Log a mutation event
   */
  logMutation(
    action: 'create' | 'update' | 'delete',
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    outcome: AuditEvent['outcome'],
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      type: 'mutation',
      action,
      actor,
      resource,
      outcome,
      metadata,
    });
  }

  /**
   * Log an admin action
   */
  logAdmin(
    action: string,
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    outcome: AuditEvent['outcome'],
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      type: 'admin',
      action,
      actor,
      resource,
      outcome,
      metadata,
    });
  }

  /**
   * Log a security event
   */
  logSecurity(
    action: 'rate_limit' | 'blocked' | 'suspicious' | 'policy_violation',
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    outcome: AuditEvent['outcome'],
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      type: 'security',
      action,
      actor,
      resource,
      outcome,
      metadata,
    });
  }

  private log(event: Omit<AuditEvent, 'timestamp' | 'context'>): void {
    const traceContext = getTraceContext();
    const fullEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      context: {
        traceId: traceContext.traceId,
        requestId: undefined, // Set by middleware
        tenantId: undefined, // Set by middleware
      },
    };

    // Use warn level for audit events to ensure they're always captured
    this.logger.warn({ auditEvent: fullEvent }, `AUDIT: ${event.type}.${event.action}`);
  }
}

// =============================================================================
// LOG LEVEL UTILITIES
// =============================================================================

/**
 * Map log level to pino level
 */
export function mapLogLevel(level: LogLevel): Level {
  return level as Level;
}

/**
 * Check if a log level is enabled
 */
export function isLevelEnabled(logger: PinoLogger, level: LogLevel): boolean {
  return logger.isLevelEnabled(level);
}

// =============================================================================
// STRUCTURED ERROR LOGGING
// =============================================================================

export interface ErrorLogContext {
  error: Error;
  operation?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an error with full context
 */
export function logError(logger: PinoLogger, context: ErrorLogContext): void {
  const { error, operation, userId, requestId, metadata } = context;

  logger.error(
    {
      err: error,
      operation,
      userId,
      requestId,
      errorType: error.name,
      errorCode: (error as any).code,
      ...metadata,
      ...getTraceContext(),
    },
    error.message
  );
}

/**
 * Log a warning with context
 */
export function logWarning(
  logger: PinoLogger,
  message: string,
  context?: Record<string, unknown>
): void {
  logger.warn({ ...context, ...getTraceContext() }, message);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { PinoLogger as Logger };
export type { LoggerOptions };
