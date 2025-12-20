import { logger } from '../config/logger.js';

export class Logger {
  private log;

  constructor(context: string) {
    this.log = logger.child({ context });
  }

  info(message: string, ...args: any[]) {
    this.log.info(message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log.error(message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log.warn(message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log.debug(message, ...args);
  }
}
