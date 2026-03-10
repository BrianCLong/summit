import { LedgerStore } from '../../ledger/store.js';
import { LedgerEvent, LedgerEventType } from '../../ledger/event-schema.js';
import { generateEvidenceId } from '../../ledger/evidence-id.js';
import { randomUUID } from 'node:crypto';

export class LedgerAdapter {
    private store: LedgerStore;
    private sequence: number = 0;

    constructor(store: LedgerStore) {
        this.store = store;
    }

    public recordEvent(
        workflowId: string,
        type: LedgerEventType,
        payload: Record<string, unknown>,
        stepId?: string,
        actor?: string
    ): LedgerEvent {
        this.sequence += 1;
        const evidenceId = generateEvidenceId(workflowId, this.sequence);
        const event: LedgerEvent = {
            event_id: randomUUID(),
            workflow_id: workflowId,
            seq: this.sequence,
            type,
            step_id: stepId,
            actor,
            evidence_id: evidenceId,
            deterministic_time: process.env.DETERMINISTIC_TIME || new Date().toISOString(),
            payload
        };

        // Very basic redaction before store
        const safePayload = this.redact(payload);
        event.payload = safePayload;

        this.store.append(event);
        return event;
    }

    private redact(payload: Record<string, unknown>): Record<string, unknown> {
        const copy = { ...payload };
        const denyList = ['token', 'password', 'secret', 'key'];
        for (const key of Object.keys(copy)) {
             if (denyList.some(d => key.toLowerCase().includes(d))) {
                 copy[key] = '[REDACTED]';
             }
        }
        return copy;
    }
}
