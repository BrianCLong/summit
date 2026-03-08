"use strict";
/**
 * Government AI Governance Types
 *
 * Open source, auditable type definitions for government AI services.
 * Licensed under Apache-2.0 for full transparency and auditability.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceAssessmentSchema = exports.ComplianceStandardSchema = exports.AIDecisionSchema = exports.AuditEventSchema = exports.TransparencyReportSchema = exports.AIModelRegistrationSchema = exports.EthicalPrincipleSchema = exports.DataAccessRequestSchema = exports.CitizenConsentSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Citizen Data Control
// ============================================================================
exports.CitizenConsentSchema = zod_1.z.object({
    citizenId: zod_1.z.string().uuid(),
    dataCategories: zod_1.z.array(zod_1.z.enum([
        'personal_identity',
        'contact_information',
        'biometric',
        'financial',
        'health',
        'location',
        'behavioral',
        'communications',
        'government_records',
    ])),
    purposes: zod_1.z.array(zod_1.z.enum([
        'service_delivery',
        'fraud_prevention',
        'public_safety',
        'research_anonymized',
        'interagency_sharing',
        'legal_compliance',
    ])),
    consentGiven: zod_1.z.boolean(),
    consentTimestamp: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
    withdrawable: zod_1.z.boolean().default(true),
});
exports.DataAccessRequestSchema = zod_1.z.object({
    requestId: zod_1.z.string().uuid(),
    citizenId: zod_1.z.string().uuid(),
    requestType: zod_1.z.enum(['access', 'rectification', 'erasure', 'portability', 'restriction']),
    dataCategories: zod_1.z.array(zod_1.z.string()),
    justification: zod_1.z.string().optional(),
    submittedAt: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['pending', 'processing', 'completed', 'denied']),
    completedAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// AI Ethics & Compliance
// ============================================================================
exports.EthicalPrincipleSchema = zod_1.z.enum([
    'fairness',
    'accountability',
    'transparency',
    'privacy',
    'security',
    'human_oversight',
    'non_discrimination',
    'explainability',
    'proportionality',
    'lawfulness',
]);
exports.AIModelRegistrationSchema = zod_1.z.object({
    modelId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    purpose: zod_1.z.string(),
    riskLevel: zod_1.z.enum(['minimal', 'limited', 'high', 'unacceptable']),
    dataCategories: zod_1.z.array(zod_1.z.string()),
    ethicalReview: zod_1.z.object({
        reviewedAt: zod_1.z.string().datetime(),
        reviewedBy: zod_1.z.string(),
        principlesAssessed: zod_1.z.array(exports.EthicalPrincipleSchema),
        findings: zod_1.z.array(zod_1.z.object({
            principle: exports.EthicalPrincipleSchema,
            status: zod_1.z.enum(['compliant', 'needs_mitigation', 'non_compliant']),
            notes: zod_1.z.string().optional(),
        })),
        overallStatus: zod_1.z.enum(['approved', 'conditional', 'rejected']),
    }),
    biasAssessment: zod_1.z.object({
        assessedAt: zod_1.z.string().datetime(),
        protectedAttributes: zod_1.z.array(zod_1.z.string()),
        disparateImpactRatios: zod_1.z.record(zod_1.z.number()),
        mitigationsApplied: zod_1.z.array(zod_1.z.string()),
    }).optional(),
    humanOversightRequired: zod_1.z.boolean(),
    appealMechanismEnabled: zod_1.z.boolean(),
    sourceCodeHash: zod_1.z.string(),
    trainingDataLineage: zod_1.z.string(),
    deploymentEnvironments: zod_1.z.array(zod_1.z.enum(['development', 'staging', 'production'])),
    registeredAt: zod_1.z.string().datetime(),
    lastAuditedAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Transparency & Audit
// ============================================================================
exports.TransparencyReportSchema = zod_1.z.object({
    reportId: zod_1.z.string().uuid(),
    reportingPeriod: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    }),
    agency: zod_1.z.string(),
    aiSystemsDeployed: zod_1.z.number(),
    decisionsAugmented: zod_1.z.number(),
    decisionsAutomated: zod_1.z.number(),
    appealsReceived: zod_1.z.number(),
    appealsUpheld: zod_1.z.number(),
    dataAccessRequests: zod_1.z.number(),
    dataAccessCompleted: zod_1.z.number(),
    incidentsReported: zod_1.z.number(),
    incidentsResolved: zod_1.z.number(),
    biasAuditsCompleted: zod_1.z.number(),
    ethicalReviewsCompleted: zod_1.z.number(),
    publicConsultationsHeld: zod_1.z.number(),
    generatedAt: zod_1.z.string().datetime(),
    publishedAt: zod_1.z.string().datetime().optional(),
});
exports.AuditEventSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    eventType: zod_1.z.enum([
        'model_registered',
        'model_deployed',
        'model_retired',
        'decision_made',
        'decision_appealed',
        'decision_overridden',
        'consent_granted',
        'consent_withdrawn',
        'data_accessed',
        'data_exported',
        'data_deleted',
        'bias_detected',
        'ethical_review_completed',
        'human_review_triggered',
        'transparency_report_published',
    ]),
    actorId: zod_1.z.string(),
    actorType: zod_1.z.enum(['citizen', 'official', 'system', 'auditor']),
    resourceType: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.unknown()),
    previousHash: zod_1.z.string(),
    currentHash: zod_1.z.string(),
});
// ============================================================================
// AI Decision Transparency
// ============================================================================
exports.AIDecisionSchema = zod_1.z.object({
    decisionId: zod_1.z.string().uuid(),
    modelId: zod_1.z.string().uuid(),
    citizenId: zod_1.z.string().uuid().optional(),
    caseId: zod_1.z.string().optional(),
    decisionType: zod_1.z.string(),
    inputSummary: zod_1.z.record(zod_1.z.unknown()),
    outputSummary: zod_1.z.record(zod_1.z.unknown()),
    confidence: zod_1.z.number().min(0).max(1),
    explanation: zod_1.z.object({
        humanReadable: zod_1.z.string(),
        technicalDetails: zod_1.z.record(zod_1.z.unknown()),
        contributingFactors: zod_1.z.array(zod_1.z.object({
            factor: zod_1.z.string(),
            weight: zod_1.z.number(),
            direction: zod_1.z.enum(['positive', 'negative', 'neutral']),
        })),
    }),
    humanReviewRequired: zod_1.z.boolean(),
    humanReviewStatus: zod_1.z.enum(['not_required', 'pending', 'approved', 'modified', 'rejected']).optional(),
    appealable: zod_1.z.boolean(),
    appealDeadline: zod_1.z.string().datetime().optional(),
    madeAt: zod_1.z.string().datetime(),
});
// ============================================================================
// Compliance Standards
// ============================================================================
exports.ComplianceStandardSchema = zod_1.z.object({
    standardId: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    jurisdiction: zod_1.z.string(),
    requirements: zod_1.z.array(zod_1.z.object({
        requirementId: zod_1.z.string(),
        description: zod_1.z.string(),
        mandatory: zod_1.z.boolean(),
        category: zod_1.z.enum([
            'transparency',
            'accountability',
            'privacy',
            'security',
            'fairness',
            'human_oversight',
            'documentation',
            'testing',
        ]),
    })),
});
exports.ComplianceAssessmentSchema = zod_1.z.object({
    assessmentId: zod_1.z.string().uuid(),
    modelId: zod_1.z.string().uuid(),
    standardId: zod_1.z.string(),
    assessedAt: zod_1.z.string().datetime(),
    assessedBy: zod_1.z.string(),
    results: zod_1.z.array(zod_1.z.object({
        requirementId: zod_1.z.string(),
        status: zod_1.z.enum(['met', 'partially_met', 'not_met', 'not_applicable']),
        evidence: zod_1.z.string().optional(),
        remediation: zod_1.z.string().optional(),
    })),
    overallCompliance: zod_1.z.number().min(0).max(100),
    nextReviewDate: zod_1.z.string().datetime(),
});
