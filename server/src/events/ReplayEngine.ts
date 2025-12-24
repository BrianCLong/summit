
import { GraphEvent, EventType } from './types';

export class ReplayEngine {
  // Rebuilds state from an event stream into an in-memory map
  static rebuildState(events: GraphEvent[]): Map<string, any> {
    const state = new Map<string, any>();

    // Sort by timestamp if not already sorted? Assuming append-only order is preserved.

    for (const event of events) {
      if (event.type === EventType.NODE_CREATED || event.type === EventType.NODE_UPDATED) {
        state.set(event.entityId, event.after);
      } else if (event.type === EventType.NODE_DELETED) {
        state.delete(event.entityId);
      }
      // Handle edges similarly...
    }

    return state;
  }
}
