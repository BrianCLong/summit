/**
 * Structured Logger
 * Provides consistent logging with tenant context
 */

import { config } from '../config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  private log(level: LogLevel, message: string, data?: LogContext): void {
    const levelPriority: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    const configLevel = config.logLevel as LogLevel;
    if (levelPriority[level] < levelPriority[configLevel]) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...this.context,
      ...data,
    };

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  debug(message: string, data?: LogContext): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: LogContext): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: LogContext): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: LogContext): void {
    this.log('error', message, data);
  }
}

export const logger = new Logger(config.serviceName);
