"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashChainAuditService = exports.HashChainAuditService = void 0;
const appendOnlyAuditStore_js_1 = require("../../audit/appendOnlyAuditStore.js");
const crypto_1 = __importDefault(require("crypto"));
class HashChainAuditService {
    store;
    constructor() {
        this.store = new appendOnlyAuditStore_js_1.AppendOnlyAuditStore({
            filePath: process.env.MUTATION_AUDIT_STORE || './logs/audit/mutations.jsonl'
        });
    }
    async recordMutation(input) {
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
            decision_id: crypto_1.default.randomUUID(),
            trace_id: input.traceId || crypto_1.default.randomUUID(),
            timestamp: new Date().toISOString(),
            customer: input.customer,
            metadata: {
                change_summary: input.changeSummary,
                previous_state: input.previousState,
                new_state: input.newState
            }
        });
    }
    async verifyChain() {
        return this.store.verify();
    }
    async getMutationHistory(resourceId) {
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
exports.HashChainAuditService = HashChainAuditService;
exports.hashChainAuditService = new HashChainAuditService();
