/**
 * Core structured logger implementation using Pino
 */
import pino, { Logger as PinoLogger } from 'pino';
import {
  LoggerConfig,
  StructuredLogger,
  LogMetadata,
  AuditEventData,
} from './types.js';
import { DEFAULT_REDACT_PATHS, redactSensitiveData } from './redaction.js';

/**
 * Create a structured logger instance
 */
export function createLogger(config: LoggerConfig = {}): StructuredLogger {
  const {
    level = (process.env.LOG_LEVEL as any) || 'info',
    pretty = process.env.NODE_ENV === 'development',
    redactPaths = DEFAULT_REDACT_PATHS,
    service = process.env.SERVICE_NAME || 'intelgraph',
    environment = process.env.NODE_ENV || 'development',
    version = process.env.APP_VERSION || '1.0.0',
  } = config;

  // Base configuration
  const pinoConfig: pino.LoggerOptions = {
    level,
    base: {
      service,
      environment,
      version,
      pid: process.pid,
    },
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level(label) {
        return { level: label.toUpperCase() };
      },
      bindings(bindings) {
        return {
          pid: bindings.pid,
          hostname: bindings.hostname,
        };
      },
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  };

  // Add pretty printing for development
  if (pretty) {
    pinoConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
        messageFormat: '{service} [{level}] {correlationId} - {msg}',
        singleLine: false,
      },
    };
  }

  const pinoLogger = pino(pinoConfig);

  // Wrap Pino logger with our interface
  return createStructuredLogger(pinoLogger);
}

/**
 * Wrap a Pino logger instance with our StructuredLogger interface
 */
function createStructuredLogger(
  pinoLogger: PinoLogger
): StructuredLogger {
  return {
    trace(msg: string, metadata?: LogMetadata): void {
      pinoLogger.trace(metadata || {}, msg);
    },

    debug(msg: string, metadata?: LogMetadata): void {
      pinoLogger.debug(metadata || {}, msg);
    },

    info(msg: string, metadata?: LogMetadata): void {
      pinoLogger.info(metadata || {}, msg);
    },

    warn(msg: string, metadata?: LogMetadata): void {
      pinoLogger.warn(metadata || {}, msg);
    },

    error(msgOrError: string | Error, metadata?: LogMetadata): void {
      if (msgOrError instanceof Error) {
        pinoLogger.error(
          { err: msgOrError, ...metadata },
          msgOrError.message
        );
      } else {
        pinoLogger.error(metadata || {}, msgOrError);
      }
    },

    fatal(msg: string, metadata?: LogMetadata): void {
      pinoLogger.fatal(metadata || {}, msg);
    },

    child(bindings: LogMetadata): StructuredLogger {
      return createStructuredLogger(pinoLogger.child(bindings));
    },

    audit(event: AuditEventData): void {
      // Redact sensitive data from audit events
      const sanitizedEvent = redactSensitiveData(event);

      pinoLogger.info(
        {
          ...sanitizedEvent,
          auditEvent: true,
          timestamp: event.timestamp || new Date().toISOString(),
        },
        `AUDIT: ${event.action} on ${event.resourceType}${event.resourceId ? ` [${event.resourceId}]` : ''}`
      );
    },
  };
}

/**
 * Default logger instance for the application
 * Can be imported and used directly
 */
export const logger = createLogger();
