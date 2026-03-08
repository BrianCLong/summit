"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPolicyDecisionStore = void 0;
const hash_js_1 = require("../lib/hash.js");
class InMemoryPolicyDecisionStore {
    preflights = new Map();
    executions = new Map();
    async getPreflight(id) {
        return this.preflights.get(id);
    }
    async recordExecution(preflightId, execution) {
        const records = this.executions.get(preflightId) ?? [];
        records.push(execution);
        this.executions.set(preflightId, records);
    }
    upsertPreflight(payload) {
        const record = {
            id: payload.id,
            action: payload.action,
            inputHash: (0, hash_js_1.hashExecutionInput)({
                action: payload.action,
                input: payload.input,
            }),
            expiresAt: payload.expiresAt,
            context: payload.context,
            request: payload.request,
        };
        this.preflights.set(payload.id, record);
        return record;
    }
    getExecutions(preflightId) {
        return this.executions.get(preflightId) ?? [];
    }
}
exports.InMemoryPolicyDecisionStore = InMemoryPolicyDecisionStore;
