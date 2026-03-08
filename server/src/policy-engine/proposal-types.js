"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyChangeProposalSchema = exports.ProposalStatusSchema = exports.VerificationSchema = exports.RiskAssessmentSchema = exports.ProposedChangeSchema = exports.ConfigOperationSchema = void 0;
// @ts-nocheck
const zod_1 = require("zod");
// Define the schema for a change operation
exports.ConfigOperationSchema = zod_1.z.enum(['add', 'remove', 'replace']);
exports.ProposedChangeSchema = zod_1.z.object({
    target: zod_1.z.string(), // file path
    keyPath: zod_1.z.string(), // dot-notation path to config key
    operation: exports.ConfigOperationSchema,
    value: zod_1.z.any(), // The new value (for add/replace) or undefined (for remove)
    originalValue: zod_1.z.any().optional(), // For verification
});
// Risk Assessment Schema
exports.RiskAssessmentSchema = zod_1.z.object({
    blastRadius: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    falsePositiveRisk: zod_1.z.enum(['low', 'medium', 'high']),
    rollbackSteps: zod_1.z.array(zod_1.z.string()),
});
// Verification Schema
exports.VerificationSchema = zod_1.z.object({
    commands: zod_1.z.array(zod_1.z.string()),
    expectedSignals: zod_1.z.array(zod_1.z.string()),
});
// Proposal Status Schema
exports.ProposalStatusSchema = zod_1.z.enum(['proposed', 'approved', 'rejected', 'applied']);
// Main Policy Change Proposal Schema
exports.PolicyChangeProposalSchema = zod_1.z.object({
    id: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(), // ISO 8601
    createdBy: zod_1.z.string(), // "policy-auto-tuning-engine" usually
    inputEvidenceRefs: zod_1.z.array(zod_1.z.string()), // IDs of alerts/incidents
    rationale: zod_1.z.string(),
    machineRationale: zod_1.z.object({
        trigger: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
        features: zod_1.z.record(zod_1.z.any()),
    }),
    proposedChanges: zod_1.z.array(exports.ProposedChangeSchema),
    riskAssessment: exports.RiskAssessmentSchema,
    verification: exports.VerificationSchema,
    status: exports.ProposalStatusSchema,
});
