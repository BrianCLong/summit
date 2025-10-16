/* eslint-disable no-console */
import type { MigrationLogger } from './types.js';

export class ConsoleLogger implements MigrationLogger {
  constructor(private readonly namespace = 'db-migrations') {}

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    const payload = { namespace: this.namespace, level, message, ...(meta ?? {}) };
    if (level === 'error') {
      console.error(payload);
      return;
    }
    if (level === 'warn') {
      console.warn(payload);
      return;
    }
    if (level === 'info') {
      console.info(payload);
      return;
    }
    console.debug(payload);
  }
}
