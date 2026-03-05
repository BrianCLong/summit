export type LogMetadata = Record<string, unknown>;

export interface Logger {
  info(message: string, meta?: LogMetadata): void;
  warn(message: string, meta?: LogMetadata): void;
  error(message: string, meta?: LogMetadata): void;
  debug(message: string, meta?: LogMetadata): void;
}

export interface MetricsClient {
  increment(metric: string, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
}

export class ConsoleLogger implements Logger {
  info(message: string, meta?: LogMetadata) {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
  }

  warn(message: string, meta?: LogMetadata) {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta }));
  }

  error(message: string, meta?: LogMetadata) {
    console.error(JSON.stringify({ level: 'error', message, ...meta }));
  }

  debug(message: string, meta?: LogMetadata) {
    console.debug(JSON.stringify({ level: 'debug', message, ...meta }));
  }
}

export class NoopMetrics implements MetricsClient {
  increment() {}

  histogram() {}
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
