import { EntitySnapshot, WorldEvent, EntityState } from "./types.js";
import { allowedActions } from "./affordances.js";
import { canTransition } from "./stateMachine.js";

export function emptySnapshot(entity_id: string, type: string): EntitySnapshot {
  return {
    entity_id,
    type,
    current_state: "unknown",
  };
}

export function applyEvent(snapshot: EntitySnapshot, event: WorldEvent): EntitySnapshot {
  let newState = snapshot.current_state;

  if (event.payload && typeof event.payload.state === "string") {
    const requestedState = event.payload.state as EntityState;
    if (canTransition(snapshot.current_state, requestedState, event.event_type)) {
      newState = requestedState;
    }
  }

  let owner = snapshot.owner;
  if (event.payload && typeof event.payload.owner === "string") {
    owner = event.payload.owner;
  }

  const updatedSnapshot: EntitySnapshot = {
    ...snapshot,
    current_state: newState,
    owner,
    last_changed_by_event: event.evidence_id,
  };

  updatedSnapshot.allowed_actions = allowedActions(updatedSnapshot);
  return updatedSnapshot;
}

export function reduceEvents(entity_id: string, type: string, events: WorldEvent[]): EntitySnapshot {
  return [...events]
    .sort((a, b) => a.observed_at.localeCompare(b.observed_at))
    .reduce(applyEvent, emptySnapshot(entity_id, type));
}
