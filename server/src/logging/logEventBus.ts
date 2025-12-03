import { EventEmitter } from 'events';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEvent {
  level: LogLevel;
  message: string;
  timestamp?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  tenantId?: string;
  userId?: string;
  source?: string;
  service?: string;
  context?: Record<string, unknown>;
}

class LogEventBus extends EventEmitter {
  private readonly buffer: LogEvent[] = [];

  constructor(private readonly capacity = 500) {
    super();
  }

  publish(event: LogEvent): void {
    const enriched: LogEvent = {
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };

    this.buffer.push(enriched);
    if (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }

    this.emit('log', enriched);
  }

  subscribe(listener: (event: LogEvent) => void): () => void {
    this.on('log', listener);
    return () => this.off('log', listener);
  }

  recent(limit = 100): LogEvent[] {
    return this.buffer.slice(-limit);
  }

  reset(): void {
    this.buffer.splice(0, this.buffer.length);
  }
}

export const logEventBus = new LogEventBus(1000);
