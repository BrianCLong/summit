import { LineageEvent } from './types.js';

export interface ProvenanceStore {
  putEvent(event: LineageEvent): Promise<void>;
  getLineage(entityId: string): Promise<LineageEvent[]>;
}
