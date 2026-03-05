import { AppendOnlyAuditStore, type AuditClassification } from '../../audit/appendOnlyAuditStore.js';
import crypto from 'crypto';

export interface MutationAuditInput {
    actorId: string;
    action: 'create' | 'update' | 'delete';
    resourceType: string;
    resourceId: string;
    changeSummary: string;
    previousState?: any;
    newState?: any;
    classification?: AuditClassification;
    customer?: string;
    traceId?: string;
}

export class HashChainAuditService {
    private store: AppendOnlyAuditStore;

    constructor() {
        this.store = new AppendOnlyAuditStore({
            filePath: process.env.MUTATION_AUDIT_STORE || './logs/audit/mutations.jsonl'
        });
    }

    async recordMutation(input: MutationAuditInput): Promise<void> {
        await this.store.append({
            version: 'audit_event_v1',
            actor: { type: 'user', id: input.actorId },
            action: `mutation:${input.action}`,
            resource: {
                type: input.resourceType,
                id: input.resourceId
            },
            classification: input.classification || 'internal',
            policy_version: '1.0.0',
            decision_id: crypto.randomUUID(),
            trace_id: input.traceId || crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            customer: input.customer,
            metadata: {
                change_summary: input.changeSummary,
                previous_state: input.previousState,
                new_state: input.newState
            }
        });
    }

    async verifyChain(): Promise<{ ok: boolean; checked: number; errors: string[] }> {
        return this.store.verify();
    }

    async getMutationHistory(resourceId: string): Promise<any[]> {
        const all = await this.store.readRange();
        return all
            .filter(record => record.event.resource.id === resourceId)
            .map(record => ({
                timestamp: record.event.timestamp,
                actorId: record.event.actor.id,
                action: record.event.action,
                changeSummary: record.event.metadata?.change_summary,
                hash: record.hash
            }));
    }
}

export const hashChainAuditService = new HashChainAuditService();
