/**
 * Comprehensive Logging Framework
 */

import winston from 'winston';
import {
  LogEntry,
  LogLevel,
  LogContext,
  LogQuery,
  LogFormat,
  LogTransport,
} from '../types/index.js';

export class Logger {
  private logger: winston.Logger;
  private context: Partial<LogContext>;

  constructor(context: Partial<LogContext> = {}) {
    this.context = context;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format,
      defaultMeta: this.context,
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });
  }

  trace(message: string, metadata?: Record<string, any>): void {
    this.log('trace', message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('error', message, { ...metadata, error });
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('fatal', message, { ...metadata, error });
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.context as LogContext,
      metadata,
      traceId: this.generateTraceId(),
    };

    this.logger.log(level, message, metadata);
  }

  child(additionalContext: Partial<LogContext>): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    });
  }

  private generateTraceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return 'trace_' + timestamp + '_' + random;
  }
}

export class LogStore {
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;

  async store(entry: LogEntry): Promise<void> {
    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  async query(query: LogQuery): Promise<LogEntry[]> {
    let results = [...this.logs];

    // Filter by time range
    if (query.startTime) {
      results = results.filter((log) => log.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter((log) => log.timestamp <= query.endTime!);
    }

    // Filter by level
    if (query.level) {
      results = results.filter((log) => log.level === query.level);
    }

    // Filter by context
    if (query.context) {
      results = results.filter((log) => {
        return Object.entries(query.context!).every(
          ([key, value]) => log.context[key as keyof LogContext] === value
        );
      });
    }

    // Search in message
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter((log) =>
        log.message.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return results.slice(offset, offset + limit);
  }

  async clear(): Promise<void> {
    this.logs = [];
  }

  getStats(): {
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
  } {
    const byLevel: Record<string, number> = {};

    for (const log of this.logs) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    }

    return {
      totalLogs: this.logs.length,
      byLevel: byLevel as Record<LogLevel, number>,
    };
  }
}

export class StructuredLogger {
  private logger: Logger;
  private store: LogStore;

  constructor(context: Partial<LogContext> = {}) {
    this.logger = new Logger(context);
    this.store = new LogStore();
  }

  async logOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Partial<LogContext>
  ): Promise<T> {
    const startTime = Date.now();
    const operationLogger = this.logger.child({ operation, ...context });

    operationLogger.info('Starting operation: ' + operation);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      operationLogger.info('Completed operation: ' + operation, {
        durationMs: duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      operationLogger.error(
        'Failed operation: ' + operation,
        error as Error,
        {
          durationMs: duration,
          success: false,
        }
      );

      throw error;
    }
  }

  getLogger(): Logger {
    return this.logger;
  }

  getStore(): LogStore {
    return this.store;
  }
}

// Singleton instance
export const logger = new StructuredLogger();
