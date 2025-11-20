/**
 * Simple logger utility
 */

import pino from 'pino';

export class Logger {
  private logger: pino.Logger;

  constructor(name: string) {
    this.logger = pino({
      name,
      level: process.env.LOG_LEVEL || 'info'
    });
  }

  info(message: string, ...args: any[]): void {
    this.logger.info(message, ...args);
  }

  error(message: string, error?: any): void {
    this.logger.error({ err: error }, message);
  }

  warn(message: string, ...args: any[]): void {
    this.logger.warn(message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.logger.debug(message, ...args);
  }
}
