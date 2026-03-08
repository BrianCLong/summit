"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGULATORY_SOURCES = exports.ComplianceStatusSchema = exports.WorkflowAdaptationSchema = exports.ImpactAssessmentSchema = exports.RegulationSchema = exports.RegulationSourceSchema = void 0;
const zod_1 = require("zod");
// Regulation source types
exports.RegulationSourceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['rss', 'api', 'scraper', 'webhook']),
    url: zod_1.z.string().url(),
    jurisdiction: zod_1.z.enum(['US', 'EU', 'UK', 'INTL', 'STATE']),
    categories: zod_1.z.array(zod_1.z.string()),
    pollingIntervalMinutes: zod_1.z.number().default(60),
    enabled: zod_1.z.boolean().default(true),
    lastChecked: zod_1.z.date().optional(),
    credentials: zod_1.z.record(zod_1.z.string()).optional(),
});
// Regulation entity
exports.RegulationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceId: zod_1.z.string().uuid(),
    externalId: zod_1.z.string(),
    title: zod_1.z.string(),
    summary: zod_1.z.string().optional(),
    fullText: zod_1.z.string().optional(),
    jurisdiction: zod_1.z.enum(['US', 'EU', 'UK', 'INTL', 'STATE']),
    regulatoryBody: zod_1.z.string(),
    categories: zod_1.z.array(zod_1.z.string()),
    effectiveDate: zod_1.z.date().optional(),
    publishedDate: zod_1.z.date(),
    status: zod_1.z.enum(['draft', 'proposed', 'final', 'effective', 'superseded']),
    url: zod_1.z.string().url(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Impact assessment
exports.ImpactAssessmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    regulationId: zod_1.z.string().uuid(),
    severity: zod_1.z.enum(['critical', 'high', 'medium', 'low', 'informational']),
    impactAreas: zod_1.z.array(zod_1.z.object({
        area: zod_1.z.string(),
        description: zod_1.z.string(),
        affectedSystems: zod_1.z.array(zod_1.z.string()),
        requiredActions: zod_1.z.array(zod_1.z.string()),
        deadline: zod_1.z.date().optional(),
    })),
    complianceGaps: zod_1.z.array(zod_1.z.object({
        gapId: zod_1.z.string(),
        description: zod_1.z.string(),
        currentState: zod_1.z.string(),
        requiredState: zod_1.z.string(),
        remediationSteps: zod_1.z.array(zod_1.z.string()),
        estimatedEffort: zod_1.z.string(),
    })),
    riskScore: zod_1.z.number().min(0).max(100),
    autoRemediationPossible: zod_1.z.boolean(),
    recommendedActions: zod_1.z.array(zod_1.z.string()),
    assessedAt: zod_1.z.date(),
    assessedBy: zod_1.z.enum(['ai', 'human', 'hybrid']),
});
// Workflow adaptation
exports.WorkflowAdaptationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    regulationId: zod_1.z.string().uuid(),
    assessmentId: zod_1.z.string().uuid(),
    adaptationType: zod_1.z.enum([
        'policy_update',
        'workflow_modification',
        'data_handling_change',
        'access_control_change',
        'notification_rule',
        'audit_requirement',
        'retention_policy',
    ]),
    targetSystem: zod_1.z.string(),
    changes: zod_1.z.array(zod_1.z.object({
        changeType: zod_1.z.enum(['add', 'modify', 'remove']),
        component: zod_1.z.string(),
        before: zod_1.z.unknown().optional(),
        after: zod_1.z.unknown(),
        rationale: zod_1.z.string(),
    })),
    status: zod_1.z.enum(['pending', 'approved', 'applied', 'rolled_back', 'failed']),
    requiresApproval: zod_1.z.boolean(),
    approvedBy: zod_1.z.string().optional(),
    appliedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
});
// Compliance status
exports.ComplianceStatusSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    regulationId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['compliant', 'non_compliant', 'partial', 'pending_review', 'exempt']),
    complianceScore: zod_1.z.number().min(0).max(100),
    lastVerified: zod_1.z.date(),
    nextReviewDate: zod_1.z.date(),
    evidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        documentUrl: zod_1.z.string().optional(),
        verifiedAt: zod_1.z.date(),
    })),
    exceptions: zod_1.z.array(zod_1.z.object({
        reason: zod_1.z.string(),
        approvedBy: zod_1.z.string(),
        expiresAt: zod_1.z.date(),
    })),
});
// Predefined regulatory sources
exports.REGULATORY_SOURCES = [
    {
        name: 'Federal Register',
        type: 'rss',
        url: 'https://www.federalregister.gov/api/v1/documents.rss',
        jurisdiction: 'US',
        categories: ['federal', 'executive', 'agency'],
        pollingIntervalMinutes: 60,
        enabled: true,
    },
    {
        name: 'EUR-Lex',
        type: 'api',
        url: 'https://eur-lex.europa.eu/eurlex-ws/rest/search',
        jurisdiction: 'EU',
        categories: ['gdpr', 'digital', 'ai-act', 'dma', 'dsa'],
        pollingIntervalMinutes: 120,
        enabled: true,
    },
    {
        name: 'SEC EDGAR',
        type: 'rss',
        url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=include&count=40&output=atom',
        jurisdiction: 'US',
        categories: ['securities', 'financial', 'disclosure'],
        pollingIntervalMinutes: 30,
        enabled: true,
    },
    {
        name: 'UK Legislation',
        type: 'api',
        url: 'https://www.legislation.gov.uk/new/data.feed',
        jurisdiction: 'UK',
        categories: ['uk-gdpr', 'fca', 'financial'],
        pollingIntervalMinutes: 120,
        enabled: true,
    },
    {
        name: 'NIST Cybersecurity',
        type: 'rss',
        url: 'https://www.nist.gov/news-events/cybersecurity/rss.xml',
        jurisdiction: 'US',
        categories: ['cybersecurity', 'framework', 'standards'],
        pollingIntervalMinutes: 240,
        enabled: true,
    },
];
