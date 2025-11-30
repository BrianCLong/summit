import { EventEmitter } from 'events';

export type ChmEvent = 'chm.tag.applied' | 'chm.tag.downgraded' | 'chm.tag.violated';

export interface EventPayload {
  documentId: string;
  actor: string;
  details?: Record<string, unknown>;
}

export const emitter = new EventEmitter();

export const emitEvent = (type: ChmEvent, payload: EventPayload): void => {
  emitter.emit(type, payload);
};
