import { MaestroEvent } from "./envelope";

export function validateEvent(event: any): event is MaestroEvent {
  return (
    typeof event === 'object' &&
    typeof event.event_id === 'string' &&
    typeof event.event_type === 'string' &&
    typeof event.timestamp === 'string' &&
    typeof event.tenant_id === 'string' &&
    typeof event.actor === 'object' &&
    typeof event.actor.kind === 'string' &&
    typeof event.actor.id === 'string'
  );
}
