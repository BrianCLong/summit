/**
 * Mesh Observability - Structured Logging
 *
 * Provides consistent, structured logging across all mesh services.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  service?: string;
  traceId?: string;
  spanId?: string;
  taskId?: string;
  agentId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: ErrorInfo;
}

export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  pretty?: boolean;
  output?: (entry: LogEntry) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private config: LoggerConfig;
  private context: LogContext = {};

  constructor(config: LoggerConfig) {
    this.config = config;
    this.context = { service: config.service };
  }

  /**
   * Create a child logger with additional context.
   */
  child(context: LogContext): Logger {
    const child = new Logger(this.config);
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Log a debug message.
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  /**
   * Log an info message.
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  /**
   * Log a warning message.
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  /**
   * Log an error message.
   */
  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  /**
   * Log with timing information.
   */
  timed<T>(operation: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = Date.now();
    const result = fn();

    if (result instanceof Promise) {
      return result.then((value) => {
        this.info(`${operation} completed`, { durationMs: Date.now() - start });
        return value;
      }).catch((error) => {
        this.error(`${operation} failed`, { durationMs: Date.now() - start, error: String(error) });
        throw error;
      });
    }

    this.info(`${operation} completed`, { durationMs: Date.now() - start });
    return result;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...meta },
    };

    // Extract error if present
    if (meta?.error instanceof Error) {
      entry.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack,
      };
      delete entry.context.error;
    }

    if (this.config.output) {
      this.config.output(entry);
    } else if (this.config.pretty) {
      this.prettyPrint(entry);
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  private prettyPrint(entry: LogEntry): void {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    const contextStr = Object.entries(entry.context)
      .filter(([k]) => k !== 'service')
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');

    console.log(
      `${entry.timestamp} ${color}${entry.level.toUpperCase().padEnd(5)}${reset} [${entry.context.service}] ${entry.message} ${contextStr}`
    );

    if (entry.error?.stack) {
      console.log(entry.error.stack);
    }
  }
}

/**
 * Create a logger for a service.
 */
export function createLogger(service: string, level: LogLevel = 'info'): Logger {
  // Check if running in browser or Node
  const isPretty = typeof globalThis !== 'undefined' &&
    typeof (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'string' &&
    (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !== 'production';

  return new Logger({
    service,
    level,
    pretty: isPretty,
  });
}
