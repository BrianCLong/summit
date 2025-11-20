/**
 * Shared Logger interface
 * Compatible with pino, winston, and other structured loggers
 */
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  info(obj: object, message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  warn(obj: object, message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  error(obj: object, message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  debug(obj: object, message: string, ...args: unknown[]): void;
  child?(bindings: Record<string, unknown>): Logger;
}
