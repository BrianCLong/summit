import { stdout } from 'node:process';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogPayload = Record<string, unknown> | string;

class StructuredLogger {
  private readonly context: Record<string, unknown>;

  constructor(context: Record<string, unknown> = {}) {
    this.context = context;
  }

  child(additionalContext: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({ ...this.context, ...additionalContext });
  }

  debug(payload: LogPayload, message?: string): void {
    this.log('debug', payload, message);
  }

  info(payload: LogPayload, message?: string): void {
    this.log('info', payload, message);
  }

  warn(payload: LogPayload, message?: string): void {
    this.log('warn', payload, message);
  }

  error(payload: LogPayload, message?: string): void {
    this.log('error', payload, message);
  }

  private log(level: LogLevel, payload: LogPayload, message?: string): void {
    const entry: Record<string, unknown> = {
      level,
      timestamp: new Date().toISOString(),
      ...this.context,
    };

    if (typeof payload === 'string') {
      entry.message = payload;
    } else {
      Object.assign(entry, payload);
      if (message) {
        entry.message = message;
      }
    }

    stdout.write(`${JSON.stringify(entry)}\n`);
  }
}

export const logger = new StructuredLogger({ service: 'summit-api' });
