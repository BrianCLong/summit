"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditTrailService = exports.AuditTrailService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const appendOnlyAuditStore_js_1 = require("../../audit/appendOnlyAuditStore.js");
class AuditTrailService {
    store;
    constructor(store = new appendOnlyAuditStore_js_1.AppendOnlyAuditStore()) {
        this.store = store;
    }
    async recordPolicyDecision(input) {
        await this.store.append({
            version: 'audit_event_v1',
            actor: { type: 'service', id: input.actorId },
            action: input.action,
            resource: { type: input.resourceType ?? 'policy_target', id: input.resourceId },
            classification: input.classification,
            policy_version: input.policyVersion,
            decision_id: input.decisionId ?? crypto_1.default.randomUUID(),
            trace_id: input.traceId ?? crypto_1.default.randomUUID(),
            timestamp: new Date().toISOString(),
            customer: input.customer,
            metadata: input.metadata,
        });
    }
}
exports.AuditTrailService = AuditTrailService;
exports.auditTrailService = new AuditTrailService();
