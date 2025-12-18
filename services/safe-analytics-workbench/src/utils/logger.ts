/**
 * Safe Analytics Workbench - Logger
 *
 * Structured logging utility with support for context propagation.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  workspaceId?: string;
  tenantId?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  durationMs?: number;
}

class Logger {
  private serviceName = 'safe-analytics-workbench';
  private context: LogContext = {};
  private minLevel: LogLevel = LogLevel.INFO;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && Object.values(LogLevel).includes(envLevel as LogLevel)) {
      this.minLevel = envLevel as LogLevel;
    }
  }

  /**
   * Set global context that will be included in all log entries
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.context = { ...this.context, ...context };
    childLogger.minLevel = this.minLevel;
    return childLogger;
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorInfo = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.log(LogLevel.ERROR, message, context, errorInfo);
  }

  /**
   * Log with timing information
   */
  timed<T>(
    message: string,
    fn: () => T | Promise<T>,
    context?: LogContext
  ): T | Promise<T> {
    const start = Date.now();
    const result = fn();

    if (result instanceof Promise) {
      return result.then(
        (value) => {
          this.log(LogLevel.INFO, message, context, undefined, Date.now() - start);
          return value;
        },
        (error) => {
          this.log(LogLevel.ERROR, message, context, {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }, Date.now() - start);
          throw error;
        }
      );
    }

    this.log(LogLevel.INFO, message, context, undefined, Date.now() - start);
    return result;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: LogEntry['error'],
    durationMs?: number
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      context: { ...this.context, ...context },
      error,
      durationMs,
    };

    // Remove undefined values
    if (!entry.context || Object.keys(entry.context).length === 0) {
      delete entry.context;
    }
    if (!entry.error) {
      delete entry.error;
    }
    if (entry.durationMs === undefined) {
      delete entry.durationMs;
    }

    const output = JSON.stringify(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }
}

export const logger = new Logger();
