/**
 * Logger Utility
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatLog(level: LogLevel, data: Record<string, unknown>): string {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      ...data,
      message: String(data.message || ''),
    };
    return JSON.stringify(entry);
  }

  debug(data: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatLog('debug', data));
    }
  }

  info(data: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatLog('info', data));
    }
  }

  warn(data: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', data));
    }
  }

  error(data: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', data));
    }
  }
}

export const logger = new Logger();
export default logger;
