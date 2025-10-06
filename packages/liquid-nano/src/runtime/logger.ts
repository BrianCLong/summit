import type { RuntimeLogger } from './types.js';

export class StructuredConsoleLogger implements RuntimeLogger {
  constructor(private readonly scope: string) {}

  info(message: string, context: Record<string, unknown> = {}): void {
    this.write('info', message, context);
  }

  warn(message: string, context: Record<string, unknown> = {}): void {
    this.write('warn', message, context);
  }

  error(message: string, context: Record<string, unknown> = {}): void {
    this.write('error', message, context);
  }

  private write(level: 'info' | 'warn' | 'error', message: string, context: Record<string, unknown>): void {
    const payload = {
      level,
      scope: this.scope,
      message,
      timestamp: new Date().toISOString(),
      ...context
    };
    // eslint-disable-next-line no-console
    console[level](JSON.stringify(payload));
  }
}

export function createLogger(scope: string): RuntimeLogger {
  return new StructuredConsoleLogger(scope);
}
