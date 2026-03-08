import { EntitySnapshot, WorldEvent } from "../types.js";
import { rebuildEntityState } from "../rebuild.js";
import { allowedActions } from "../affordances.js";
import { applyEvent } from "../reducer.js";

// Dummy data store for demonstration
const eventStore: WorldEvent[] = [];

export async function getEntityState(entity_id: string, type: string): Promise<EntitySnapshot> {
  return rebuildEntityState(entity_id, type, eventStore);
}

export async function getEntityHistory(entity_id: string): Promise<WorldEvent[]> {
  return eventStore.filter(e => e.entity_id === entity_id);
}

export async function getNextActions(entity_id: string, type: string): Promise<string[]> {
  const snapshot = await getEntityState(entity_id, type);
  return allowedActions(snapshot);
}

export async function simulateTransition(entity_id: string, type: string, event: WorldEvent): Promise<EntitySnapshot> {
  const snapshot = await getEntityState(entity_id, type);
  return applyEvent(snapshot, event);
}
