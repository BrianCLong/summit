/**
 * Structured Logger with OpenTelemetry Correlation
 * Provides JSON logging with trace/span context for Loki ingestion
 */

import { trace, context as otelContext, Span } from '@opentelemetry/api';
import { createHash } from 'crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  investigationId?: string;
  entityId?: string;
  relationshipId?: string;
  operation?: string;
  [key: string]: any;
}

class StructuredLogger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private log(
    level: LogLevel,
    message: string,
    context: LogContext = {}
  ): void {
    const span = trace.getActiveSpan();
    const spanContext = span?.spanContext();

    // Hash sensitive IDs for privacy
    const sanitizedContext = this.sanitizeContext(context);

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      traceId: spanContext?.traceId || 'no-trace',
      spanId: spanContext?.spanId || 'no-span',
      ...sanitizedContext,
      message,
    };

    // Output as JSON for Loki/structured ingestion
    const jsonLog = JSON.stringify(logEntry);

    // Route to appropriate console method
    switch (level) {
      case 'debug':
        console.debug(jsonLog);
        break;
      case 'info':
        console.info(jsonLog);
        break;
      case 'warn':
        console.warn(jsonLog);
        break;
      case 'error':
        console.error(jsonLog);
        break;
    }

    // Add log event to active span
    if (span) {
      span.addEvent(`log.${level}`, {
        'log.message': message,
        'log.level': level,
      });
    }
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized: LogContext = { ...context };

    // Hash user IDs to prevent PII leakage
    if (sanitized.userId) {
      sanitized.userId = this.hashId(sanitized.userId);
    }

    // Investigation IDs are okay to log (business identifiers)
    // Entity/Relationship IDs are okay (UUIDs)

    // Remove any sensitive fields
    delete sanitized.password;
    delete sanitized.secret;
    delete sanitized.token;
    delete sanitized.apiKey;

    return sanitized;
  }

  private hashId(id: string): string {
    return 'hash_' + createHash('sha256').update(id).digest('hex').slice(0, 8);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          ...context,
        }
      : context;

    this.log('error', message, errorContext);

    // Record exception on active span
    const span = trace.getActiveSpan();
    if (span && error) {
      span.recordException(error);
    }
  }

  // Measure and log operation duration
  async measure<T>(
    operationName: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = Date.now();
    this.info(`${operationName} started`, context);

    try {
      const result = await fn();
      const durationMs = Date.now() - start;

      this.info(`${operationName} succeeded`, {
        ...context,
        duration_ms: durationMs,
        status: 'success',
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - start;

      this.error(
        `${operationName} failed`,
        error as Error,
        {
          ...context,
          duration_ms: durationMs,
          status: 'error',
        }
      );

      throw error;
    }
  }
}

// Export singleton logger
export const logger = new StructuredLogger('graphql-gateway');

// Context manager for request-scoped logging
export class LogContext {
  private static contextMap = new Map<string, LogContext>();

  constructor(
    private requestId: string,
    private baseContext: LogContext = {}
  ) {
    LogContext.contextMap.set(requestId, this);
  }

  static get(requestId: string): LogContext | undefined {
    return LogContext.contextMap.get(requestId);
  }

  static cleanup(requestId: string): void {
    LogContext.contextMap.delete(requestId);
  }

  getContext(): LogContext {
    return { ...this.baseContext };
  }

  setContext(key: string, value: any): void {
    this.baseContext[key] = value;
  }
}
