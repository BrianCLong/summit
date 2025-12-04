/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

/**
 * Create a simple logger
 */
export function createLogger(name: string): Logger {
  return {
    debug: (msg: string, meta?: Record<string, any>) =>
      console.debug(`[${name}] ${msg}`, meta || ''),
    info: (msg: string, meta?: Record<string, any>) =>
      console.info(`[${name}] ${msg}`, meta || ''),
    warn: (msg: string, meta?: Record<string, any>) =>
      console.warn(`[${name}] ${msg}`, meta || ''),
    error: (msg: string, meta?: Record<string, any>) =>
      console.error(`[${name}] ${msg}`, meta || ''),
  };
}
