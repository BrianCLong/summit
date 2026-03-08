"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProviderSchema = exports.RiskAssessmentSchema = exports.ConsentRecordSchema = exports.TransactionSchema = exports.CreateProductInput = exports.DataProductSchema = exports.ConsentPurpose = exports.TransactionStatus = exports.LicenseType = exports.Regulation = exports.Classification = exports.RiskLevel = exports.DataCategory = void 0;
const zod_1 = require("zod");
// Enums
exports.DataCategory = zod_1.z.enum([
    'financial',
    'healthcare',
    'geospatial',
    'demographic',
    'behavioral',
    'industrial',
    'environmental',
    'government',
    'research',
    'other',
]);
exports.RiskLevel = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.Classification = zod_1.z.enum([
    'public',
    'internal',
    'confidential',
    'restricted',
    'top_secret',
]);
exports.Regulation = zod_1.z.enum([
    'GDPR',
    'CCPA',
    'HIPAA',
    'SOX',
    'PCI_DSS',
    'FERPA',
    'GLBA',
]);
exports.LicenseType = zod_1.z.enum([
    'single_use',
    'unlimited',
    'time_limited',
    'usage_based',
    'enterprise',
]);
exports.TransactionStatus = zod_1.z.enum([
    'pending_payment',
    'payment_received',
    'compliance_check',
    'preparing_data',
    'delivered',
    'completed',
    'disputed',
    'refunded',
    'cancelled',
]);
exports.ConsentPurpose = zod_1.z.enum([
    'analytics',
    'research',
    'marketing',
    'ai_training',
    'resale',
    'internal_use',
]);
// Data Product Schema
exports.DataProductSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    providerId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    category: exports.DataCategory,
    tags: zod_1.z.array(zod_1.z.string()),
    schemaDefinition: zod_1.z.record(zod_1.z.any()),
    rowCount: zod_1.z.number().int().positive().optional(),
    sizeBytes: zod_1.z.number().int().positive().optional(),
    lastUpdated: zod_1.z.date().optional(),
    updateFrequency: zod_1.z.string().optional(),
    qualityScore: zod_1.z.number().int().min(0).max(100).optional(),
    completeness: zod_1.z.number().min(0).max(100).optional(),
    accuracy: zod_1.z.number().min(0).max(100).optional(),
    riskScore: zod_1.z.number().int().min(0).max(100).optional(),
    riskLevel: exports.RiskLevel.optional(),
    classification: exports.Classification,
    piiFields: zod_1.z.array(zod_1.z.string()),
    regulations: zod_1.z.array(exports.Regulation),
    pricingModel: zod_1.z.string(),
    basePriceCents: zod_1.z.number().int().positive(),
    currency: zod_1.z.string().default('USD'),
    status: zod_1.z.string().default('draft'),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Create Product Input
exports.CreateProductInput = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    category: exports.DataCategory,
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    schemaDefinition: zod_1.z.record(zod_1.z.any()),
    classification: exports.Classification,
    piiFields: zod_1.z.array(zod_1.z.string()).default([]),
    regulations: zod_1.z.array(exports.Regulation).default([]),
    pricingModel: zod_1.z.string(),
    basePriceCents: zod_1.z.number().int().positive(),
    currency: zod_1.z.string().default('USD'),
});
// Transaction Schema
exports.TransactionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    buyerId: zod_1.z.string().uuid(),
    sellerId: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    agreedPriceCents: zod_1.z.number().int().positive(),
    platformFeeCents: zod_1.z.number().int(),
    sellerPayoutCents: zod_1.z.number().int(),
    currency: zod_1.z.string().default('USD'),
    licenseType: exports.LicenseType,
    usageTerms: zod_1.z.record(zod_1.z.any()),
    durationDays: zod_1.z.number().int().positive().optional(),
    status: exports.TransactionStatus,
    consentVerified: zod_1.z.boolean().default(false),
    complianceChecked: zod_1.z.boolean().default(false),
    contractHash: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    completedAt: zod_1.z.date().optional(),
    expiresAt: zod_1.z.date().optional(),
});
// Consent Record Schema
exports.ConsentRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    dataSubjectId: zod_1.z.string(),
    productId: zod_1.z.string().uuid().optional(),
    providerId: zod_1.z.string().uuid(),
    purposes: zod_1.z.array(exports.ConsentPurpose),
    scope: zod_1.z.record(zod_1.z.any()),
    grantedAt: zod_1.z.date(),
    expiresAt: zod_1.z.date().optional(),
    revokedAt: zod_1.z.date().optional(),
    revocationReason: zod_1.z.string().optional(),
    consentMethod: zod_1.z.enum(['explicit', 'opt-in', 'contractual']),
    evidenceHash: zod_1.z.string(),
    version: zod_1.z.number().int().default(1),
    createdAt: zod_1.z.date(),
});
// Risk Assessment Schema
exports.RiskAssessmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    overallScore: zod_1.z.number().int().min(0).max(100),
    riskLevel: exports.RiskLevel,
    piiScore: zod_1.z.number().int().min(0).max(100).optional(),
    sensitivityScore: zod_1.z.number().int().min(0).max(100).optional(),
    regulatoryScore: zod_1.z.number().int().min(0).max(100).optional(),
    reputationScore: zod_1.z.number().int().min(0).max(100).optional(),
    technicalScore: zod_1.z.number().int().min(0).max(100).optional(),
    findings: zod_1.z.record(zod_1.z.any()),
    recommendations: zod_1.z.array(zod_1.z.string()),
    automatedChecks: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        passed: zod_1.z.boolean(),
        details: zod_1.z.string(),
    })),
    assessedAt: zod_1.z.date(),
    assessedBy: zod_1.z.string(),
});
// Data Provider Schema
exports.DataProviderSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    type: zod_1.z.enum(['individual', 'organization', 'government']),
    verified: zod_1.z.boolean().default(false),
    verificationDate: zod_1.z.date().optional(),
    rating: zod_1.z.number().min(0).max(5).optional(),
    totalTransactions: zod_1.z.number().int().default(0),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
