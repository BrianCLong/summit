"use strict";
/**
 * Evidence Bundle & Briefing Pipeline - Core Type Definitions
 * Provides comprehensive type safety for all bundle and briefing operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleApprovalRequestSchema = exports.CreateBriefingPackageRequestSchema = exports.CreateClaimBundleRequestSchema = exports.CreateEvidenceBundleRequestSchema = exports.BriefingTypeSchema = exports.SensitivityMarkingSchema = exports.ClassificationLevelSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Zod Schemas for Validation
// ============================================================================
exports.ClassificationLevelSchema = zod_1.z.enum([
    'UNCLASSIFIED',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'SCI',
]);
exports.SensitivityMarkingSchema = zod_1.z.enum([
    'FOUO',
    'LES',
    'NOFORN',
    'ORCON',
    'RELTO',
    'PROPIN',
]);
exports.BriefingTypeSchema = zod_1.z.enum([
    'situation_report',
    'intelligence_assessment',
    'case_summary',
    'executive_brief',
    'threat_report',
    'risk_assessment',
    'daily_digest',
    'custom',
]);
exports.CreateEvidenceBundleRequestSchema = zod_1.z.object({
    caseId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().max(5000).optional(),
    evidenceIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    classificationLevel: exports.ClassificationLevelSchema,
    sensitivityMarkings: zod_1.z.array(exports.SensitivityMarkingSchema).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.CreateClaimBundleRequestSchema = zod_1.z.object({
    caseId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().max(5000).optional(),
    claimIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    evidenceBundleIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    classificationLevel: exports.ClassificationLevelSchema,
    sensitivityMarkings: zod_1.z.array(exports.SensitivityMarkingSchema).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.CreateBriefingPackageRequestSchema = zod_1.z.object({
    caseId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(500),
    briefingType: exports.BriefingTypeSchema,
    evidenceBundleIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    claimBundleIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    templateId: zod_1.z.string().uuid().optional(),
    includeExecutiveSummary: zod_1.z.boolean().default(true),
    includeSlideDecks: zod_1.z.boolean().default(false),
    generateNarrativeWithAI: zod_1.z.boolean().default(false),
    classificationLevel: exports.ClassificationLevelSchema,
    sensitivityMarkings: zod_1.z.array(exports.SensitivityMarkingSchema).optional(),
    distributionList: zod_1.z.array(zod_1.z.string()).optional(),
    deliveryChannels: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['evidence_store', 'email', 'api_webhook', 'secure_portal', 'physical']),
        config: zod_1.z.record(zod_1.z.unknown()),
        recipients: zod_1.z.array(zod_1.z.string()),
        priority: zod_1.z.enum(['immediate', 'scheduled', 'on_demand']),
    })).optional(),
    scheduleAt: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.BundleApprovalRequestSchema = zod_1.z.object({
    bundleId: zod_1.z.string().uuid(),
    bundleType: zod_1.z.enum(['evidence', 'claim', 'briefing']),
    decision: zod_1.z.enum(['approved', 'rejected']),
    comments: zod_1.z.string().max(5000).optional(),
    conditions: zod_1.z.array(zod_1.z.string()).optional(),
});
