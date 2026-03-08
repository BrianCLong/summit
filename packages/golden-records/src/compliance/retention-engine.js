"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionEngine = void 0;
const date_fns_1 = require("date-fns");
class RetentionEngine {
    legalHoldService;
    policies = new Map();
    constructor(legalHoldService) {
        this.legalHoldService = legalHoldService;
    }
    registerPolicy(recordType, tenantId, policy) {
        const key = this.buildKey(recordType, tenantId);
        this.policies.set(key, policy);
    }
    getPolicy(recordType, tenantId) {
        return this.policies.get(this.buildKey(recordType, tenantId));
    }
    evaluate(record) {
        const recordType = record.metadata.recordType;
        const tenantId = record.metadata.tenantId;
        if (!recordType || !tenantId) {
            return { expired: false, holds: [] };
        }
        const policy = this.getPolicy(recordType, tenantId);
        if (!policy) {
            return { expired: false, holds: [] };
        }
        const expiresAt = (0, date_fns_1.addDays)(record.createdAt, policy.retentionDays + (policy.purgeGraceDays ?? 0));
        const holds = this.legalHoldService
            .holdsForRecord(record.id.id, recordType, tenantId)
            .map(hold => hold.id);
        const expired = new Date() >= expiresAt && holds.length === 0;
        return { expired, expiresAt, holds };
    }
    attachMetadata(record) {
        const evaluation = this.evaluate(record);
        record.metadata.retentionExpiresAt = evaluation.expiresAt;
        record.metadata.legalHolds = evaluation.holds;
        return record;
    }
    buildKey(recordType, tenantId) {
        return `${tenantId}:${recordType}`;
    }
}
exports.RetentionEngine = RetentionEngine;
