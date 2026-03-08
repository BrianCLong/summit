"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogEntrySchema = exports.DeconflictResponseSchema = exports.DeconflictRequestSchema = exports.CommitmentSetSchema = exports.CommitmentSchema = exports.SaltSchema = void 0;
const zod_1 = require("zod");
/**
 * Zero-Knowledge Deconfliction Types
 */
exports.SaltSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    salt: zod_1.z.string(),
    createdAt: zod_1.z.string(),
});
exports.CommitmentSchema = zod_1.z.object({
    hash: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.CommitmentSetSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    commitments: zod_1.z.array(exports.CommitmentSchema),
    count: zod_1.z.number(),
    merkleRoot: zod_1.z.string(),
});
exports.DeconflictRequestSchema = zod_1.z.object({
    tenantAId: zod_1.z.string(),
    tenantBId: zod_1.z.string(),
    tenantACommitments: zod_1.z.array(zod_1.z.string()),
    tenantBCommitments: zod_1.z.array(zod_1.z.string()),
    auditContext: zod_1.z.record(zod_1.z.any()).optional(),
    revealMode: zod_1.z.enum(['cardinality']).default('cardinality'),
});
exports.DeconflictResponseSchema = zod_1.z.object({
    hasOverlap: zod_1.z.boolean(),
    overlapCount: zod_1.z.number().optional(),
    proof: zod_1.z.string(),
    auditLogId: zod_1.z.string(),
    timestamp: zod_1.z.string(),
});
exports.AuditLogEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    tenantAId: zod_1.z.string(),
    tenantBId: zod_1.z.string(),
    hasOverlap: zod_1.z.boolean(),
    overlapCount: zod_1.z.number().optional(),
    proof: zod_1.z.string(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
});
