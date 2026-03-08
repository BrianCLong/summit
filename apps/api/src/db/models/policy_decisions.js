"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyDecisionStore = void 0;
const node_crypto_1 = require("node:crypto");
class PolicyDecisionStore {
    clock;
    records = [];
    constructor(clock = () => new Date()) {
        this.clock = clock;
    }
    async insert(request, decision) {
        const record = {
            id: (0, node_crypto_1.randomUUID)(),
            subjectId: request.subject.id,
            action: request.action.name,
            resourceId: request.resource?.id,
            allow: decision.allow,
            reason: decision.reason,
            obligations: decision.obligations,
            redactions: decision.redactions,
            createdAt: this.clock().toISOString(),
            request,
            rawDecision: decision.raw
        };
        this.records.push(record);
        return record;
    }
    async all() {
        return [...this.records];
    }
    async clear() {
        this.records = [];
    }
}
exports.PolicyDecisionStore = PolicyDecisionStore;
