import type { ProvenanceEvent, ProvenanceRecorder } from './types.js';

export class InMemoryProvenanceRecorder implements ProvenanceRecorder {
  private events: ProvenanceEvent[] = [];

  record(event: ProvenanceEvent): void {
    this.events.push(event);
  }

  snapshot(): ProvenanceEvent[] {
    return [...this.events];
  }
}
