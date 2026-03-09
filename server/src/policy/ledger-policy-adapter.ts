import { LedgerAdapter } from '../agents/runtime/ledger-adapter.js';

export class LedgerPolicyAdapter {
    private ledgerAdapter: LedgerAdapter;
    private workflowId: string;

    constructor(ledgerAdapter: LedgerAdapter, workflowId: string) {
        this.ledgerAdapter = ledgerAdapter;
        this.workflowId = workflowId;
    }

    public recordDecision(action: string, isAllowed: boolean, metadata: Record<string, unknown> = {}): void {
        const eventType = isAllowed ? 'policy.allowed' : 'policy.denied';
        this.ledgerAdapter.recordEvent(this.workflowId, eventType, {
            action,
            ...metadata
        });
    }
}
