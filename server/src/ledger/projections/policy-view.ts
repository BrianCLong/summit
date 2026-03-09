import { LedgerEvent } from '../event-schema.js';

export interface PolicyDecision {
    workflow_id: string;
    action: string;
    decision: 'allowed' | 'denied';
    evidence_id: string;
}

export class PolicyViewProjection {
    public build(events: LedgerEvent[]): PolicyDecision[] {
        const decisions: PolicyDecision[] = [];

        for (const event of events) {
            if (event.type === 'policy.allowed' || event.type === 'policy.denied') {
                decisions.push({
                    workflow_id: event.workflow_id,
                    action: String(event.payload.action || 'unknown'),
                    decision: event.type === 'policy.allowed' ? 'allowed' : 'denied',
                    evidence_id: event.evidence_id
                });
            }
        }
        return decisions;
    }
}
