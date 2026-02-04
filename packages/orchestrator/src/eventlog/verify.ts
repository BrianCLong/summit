import { OrchestratorEvent } from '../types.js';

export function verifyEventChain(events: OrchestratorEvent[]): boolean {
    const seen = new Set();
    for (const evt of events) {
        if (seen.has(evt.evidence_id)) return false;
        seen.add(evt.evidence_id);
    }
    return true;
}
