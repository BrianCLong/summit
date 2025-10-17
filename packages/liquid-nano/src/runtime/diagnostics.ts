import type {
  DiagnosticTimeline,
  RuntimeDiagnosticsEvent,
  RuntimeDiagnosticsSnapshot
} from './types.js';

const MAX_EVENTS = 500;

export class RingDiagnosticsTimeline implements DiagnosticTimeline {
  private readonly events: RuntimeDiagnosticsEvent[] = [];

  push(entry: RuntimeDiagnosticsEvent): void {
    this.events.push(entry);
    if (this.events.length > MAX_EVENTS) {
      this.events.shift();
    }
  }

  last(count: number = 10): readonly RuntimeDiagnosticsEvent[] {
    if (count <= 0) {
      return [];
    }
    return this.events.slice(-count);
  }

  summarize(): RuntimeDiagnosticsSnapshot {
    const success = this.events.filter((event) => event.status === 'processed').length;
    const failed = this.events.filter((event) => event.status === 'failed').length;
    const queued = this.events.filter((event) => event.status === 'queued').length;
    return {
      events: [...this.events],
      metrics: {
        'diagnostics.success': success,
        'diagnostics.failed': failed,
        'diagnostics.queued': queued
      }
    };
  }
}

export function createDiagnosticsTimeline(): DiagnosticTimeline {
  return new RingDiagnosticsTimeline();
}
