import { reduceEvents } from "./reducer.js";
import { WorldEvent, EntitySnapshot } from "./types.js";

export function rebuildEntityState(entity_id: string, type: string, events: WorldEvent[]): EntitySnapshot {
  const filteredEvents = events.filter(e => e.entity_id === entity_id);
  return reduceEvents(entity_id, type, filteredEvents);
}
