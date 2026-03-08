"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionEngine = exports.LegalHoldSchema = exports.RetentionPolicySchema = exports.RetentionTierSchema = void 0;
exports.createRetentionEngine = createRetentionEngine;
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
exports.RetentionTierSchema = zod_1.z.enum(['regulatory', 'operational', 'analytics', 'backup']);
exports.RetentionPolicySchema = zod_1.z.object({
    id: zod_1.z.string(),
    recordType: zod_1.z.string(),
    tier: exports.RetentionTierSchema,
    durationDays: zod_1.z.number().positive(),
    deletionMode: zod_1.z.enum(['soft', 'hard']).default('soft'),
    propagateToDerived: zod_1.z.boolean().default(true),
});
exports.LegalHoldSchema = zod_1.z.object({
    id: zod_1.z.string(),
    reason: zod_1.z.string(),
    scope: zod_1.z.object({
        recordIds: zod_1.z.array(zod_1.z.string()).default([]),
        recordTypes: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
});
function now() {
    return new Date();
}
class RetentionEngine {
    framework;
    policies = new Map();
    holds = new Map();
    retentionClassDefaults = new Map();
    constructor(framework) {
        this.framework = framework;
    }
    collectDerived(record, accumulator) {
        for (const childId of record.lineage.children) {
            if (accumulator.has(childId))
                continue;
            accumulator.add(childId);
            const child = this.framework.getRecord(childId);
            if (child) {
                this.collectDerived(child, accumulator);
            }
        }
    }
    registerPolicy(policy) {
        const validated = exports.RetentionPolicySchema.parse(policy);
        this.policies.set(validated.id, validated);
    }
    registerDefault(retentionClass, policy) {
        const validated = exports.RetentionPolicySchema.parse(policy);
        this.retentionClassDefaults.set(retentionClass, validated);
    }
    placeLegalHold(hold) {
        const validated = exports.LegalHoldSchema.parse({ ...hold, createdAt: now() });
        this.holds.set(validated.id, validated);
        return validated;
    }
    removeLegalHold(holdId) {
        return this.holds.delete(holdId);
    }
    isOnHold(record) {
        for (const hold of this.holds.values()) {
            if (hold.scope.recordIds.includes(record.id))
                return true;
            if (hold.scope.recordTypes.includes(record.type))
                return true;
        }
        return false;
    }
    policyFor(record) {
        const direct = [...this.policies.values()].find(p => p.recordType === record.type);
        if (direct)
            return direct;
        return this.retentionClassDefaults.get(record.metadata.retentionClass);
    }
    previewDeletion(asOf = now()) {
        const affected = [];
        const blockedByHold = [];
        for (const record of this.framework.search({})) {
            const policy = this.policyFor(record);
            if (!policy)
                continue;
            const createdAt = record.versions[0]?.timestamp;
            if (!createdAt)
                continue;
            const expiresAt = new Date(createdAt.getTime() + policy.durationDays * 24 * 60 * 60 * 1000);
            if (expiresAt > asOf)
                continue;
            if (this.isOnHold(record)) {
                blockedByHold.push(record.id);
            }
            else {
                affected.push(record.id);
            }
        }
        return {
            affectedRecords: affected,
            blockedByHold,
            evidenceToken: crypto_1.default.randomUUID(),
        };
    }
    executeDeletion(actor, preview) {
        const plan = preview ?? this.previewDeletion();
        const deleted = [];
        const skipped = [...plan.blockedByHold];
        for (const id of plan.affectedRecords) {
            const record = this.framework.getRecord(id);
            if (!record)
                continue;
            const policy = this.policyFor(record);
            if (!policy)
                continue;
            if (this.isOnHold(record)) {
                skipped.push(id);
                continue;
            }
            const attestation = crypto_1.default.createHash('sha256').update(`${id}:${actor}:${now().toISOString()}`).digest('hex');
            this.framework.deleteRecord(id, actor, attestation);
            deleted.push(id);
            if (policy.propagateToDerived) {
                for (const childId of record.lineage.children) {
                    const child = this.framework.getRecord(childId);
                    if (child && !this.isOnHold(child)) {
                        this.framework.deleteRecord(childId, actor, attestation);
                        deleted.push(childId);
                    }
                }
            }
        }
        return { deleted, skipped, attestation: crypto_1.default.randomUUID() };
    }
    dsar(subjectId, includeDerived = true) {
        const matches = this.framework.search({ tags: [subjectId] });
        const propagation = [];
        const seen = new Set();
        const records = [];
        for (const record of matches) {
            if (seen.has(record.id))
                continue;
            seen.add(record.id);
            records.push({ id: record.id, type: record.type, metadata: record.metadata });
            if (!includeDerived)
                continue;
            const derived = new Set();
            this.collectDerived(record, derived);
            for (const childId of derived) {
                if (seen.has(childId))
                    continue;
                const child = this.framework.getRecord(childId);
                if (child) {
                    seen.add(childId);
                    propagation.push(childId);
                    records.push({ id: child.id, type: child.type, metadata: child.metadata });
                }
            }
            for (const parentId of record.lineage.parents) {
                if (seen.has(parentId))
                    continue;
                const parent = this.framework.getRecord(parentId);
                if (parent) {
                    seen.add(parentId);
                    propagation.push(parentId);
                    records.push({ id: parent.id, type: parent.type, metadata: parent.metadata });
                }
            }
        }
        return { subjectId, records, propagation };
    }
    report(asOf = now()) {
        const preview = this.previewDeletion(asOf);
        return {
            policyCount: this.policies.size,
            holds: this.holds.size,
            defaults: this.retentionClassDefaults.size,
            blockedRecords: preview.blockedByHold,
            expiringRecords: preview.affectedRecords,
        };
    }
}
exports.RetentionEngine = RetentionEngine;
function createRetentionEngine(framework) {
    return new RetentionEngine(framework);
}
