import { ProvenanceStore } from './store.js';
import { LineageEvent } from './types.js';

export class InMemoryProvenanceStore implements ProvenanceStore {
  private events: LineageEvent[] = [];

  async putEvent(event: LineageEvent): Promise<void> {
    this.events.push(event);
  }

  async getLineage(entityId: string): Promise<LineageEvent[]> {
    return this.events.filter(e =>
      e.inputs.includes(entityId) || e.outputs.includes(entityId)
    ).sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }
}
