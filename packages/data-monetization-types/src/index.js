"use strict";
/**
 * Data Monetization Engine Types
 * Comprehensive type definitions for automated data asset monetization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceCheckInput = exports.createContractInput = exports.createDataProductInput = exports.createDataAssetInput = exports.valuationSchema = exports.revenueReportSchema = exports.transactionSchema = exports.marketplaceListingSchema = exports.listingStatuses = exports.contractSchema = exports.contractTypes = exports.contractStatuses = exports.dataProductSchema = exports.accessLevels = exports.deliveryMethods = exports.pricingModels = exports.complianceCheckSchema = exports.piiCategories = exports.dataSubjectRights = exports.legalBasisTypes = exports.complianceFrameworks = exports.dataAssetSchema = exports.sensitivityLevels = exports.dataQualityLevels = exports.dataAssetCategories = void 0;
const zod_1 = require("zod");
// ============================================================================
// DATA ASSET TYPES
// ============================================================================
exports.dataAssetCategories = [
    'STRUCTURED',
    'UNSTRUCTURED',
    'GEOSPATIAL',
    'TIMESERIES',
    'GRAPH',
    'MEDIA',
    'SENSOR',
    'TRANSACTION',
    'BEHAVIORAL',
    'DEMOGRAPHIC',
];
exports.dataQualityLevels = [
    'RAW',
    'CLEANSED',
    'ENRICHED',
    'CURATED',
    'CERTIFIED',
];
exports.sensitivityLevels = [
    'PUBLIC',
    'INTERNAL',
    'CONFIDENTIAL',
    'RESTRICTED',
    'TOP_SECRET',
];
exports.dataAssetSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000).optional(),
    category: zod_1.z.enum(exports.dataAssetCategories),
    qualityLevel: zod_1.z.enum(exports.dataQualityLevels),
    sensitivityLevel: zod_1.z.enum(exports.sensitivityLevels),
    sourceSystem: zod_1.z.string(),
    schema: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    metadata: zod_1.z.object({
        recordCount: zod_1.z.number().int().nonnegative().optional(),
        sizeBytes: zod_1.z.number().int().nonnegative().optional(),
        lastUpdated: zod_1.z.string().datetime().optional(),
        refreshFrequency: zod_1.z.string().optional(),
        dataLineage: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    owner: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// COMPLIANCE & GDPR TYPES
// ============================================================================
exports.complianceFrameworks = [
    'GDPR',
    'CCPA',
    'HIPAA',
    'SOC2',
    'ISO27001',
    'FEDRAMP',
    'PCI_DSS',
    'LGPD',
    'PIPEDA',
];
exports.legalBasisTypes = [
    'CONSENT',
    'CONTRACT',
    'LEGAL_OBLIGATION',
    'VITAL_INTERESTS',
    'PUBLIC_TASK',
    'LEGITIMATE_INTERESTS',
];
exports.dataSubjectRights = [
    'ACCESS',
    'RECTIFICATION',
    'ERASURE',
    'PORTABILITY',
    'RESTRICTION',
    'OBJECTION',
    'AUTOMATED_DECISION',
];
exports.piiCategories = [
    'DIRECT_IDENTIFIER',
    'QUASI_IDENTIFIER',
    'SENSITIVE_DATA',
    'BEHAVIORAL_DATA',
    'LOCATION_DATA',
    'BIOMETRIC_DATA',
    'GENETIC_DATA',
    'HEALTH_DATA',
    'FINANCIAL_DATA',
    'POLITICAL_OPINIONS',
    'RELIGIOUS_BELIEFS',
    'TRADE_UNION',
    'SEXUAL_ORIENTATION',
    'CRIMINAL_RECORDS',
];
exports.complianceCheckSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    assetId: zod_1.z.string().uuid(),
    framework: zod_1.z.enum(exports.complianceFrameworks),
    status: zod_1.z.enum(['PENDING', 'PASSED', 'FAILED', 'REQUIRES_REVIEW']),
    legalBasis: zod_1.z.enum(exports.legalBasisTypes).optional(),
    piiDetected: zod_1.z.array(zod_1.z.enum(exports.piiCategories)).default([]),
    findings: zod_1.z.array(zod_1.z.object({
        code: zod_1.z.string(),
        severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        description: zod_1.z.string(),
        recommendation: zod_1.z.string().optional(),
        field: zod_1.z.string().optional(),
    })),
    consentRequirements: zod_1.z.array(zod_1.z.string()).default([]),
    retentionPolicy: zod_1.z
        .object({
        maxRetentionDays: zod_1.z.number().int().positive().optional(),
        reviewDate: zod_1.z.string().datetime().optional(),
        deletionRequired: zod_1.z.boolean().default(false),
    })
        .optional(),
    crossBorderRestrictions: zod_1.z.array(zod_1.z.string()).default([]),
    anonymizationRequired: zod_1.z.boolean().default(false),
    checkedAt: zod_1.z.string().datetime(),
    checkedBy: zod_1.z.string(),
    validUntil: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// DATA PRODUCT / PACKAGE TYPES
// ============================================================================
exports.pricingModels = [
    'ONE_TIME',
    'SUBSCRIPTION',
    'PAY_PER_USE',
    'TIERED',
    'REVENUE_SHARE',
    'FREEMIUM',
    'AUCTION',
];
exports.deliveryMethods = [
    'API',
    'BULK_DOWNLOAD',
    'STREAMING',
    'DATABASE_LINK',
    'SFTP',
    'CLOUD_STORAGE',
    'EMBEDDED_ANALYTICS',
];
exports.accessLevels = [
    'PREVIEW',
    'SAMPLE',
    'FULL',
    'AGGREGATED',
    'ANONYMIZED',
];
exports.dataProductSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(5000),
    shortDescription: zod_1.z.string().max(500).optional(),
    version: zod_1.z.string().default('1.0.0'),
    assets: zod_1.z.array(zod_1.z.string().uuid()),
    category: zod_1.z.enum(exports.dataAssetCategories),
    accessLevel: zod_1.z.enum(exports.accessLevels),
    pricing: zod_1.z.object({
        model: zod_1.z.enum(exports.pricingModels),
        basePriceCents: zod_1.z.number().int().nonnegative(),
        currency: zod_1.z.string().length(3).default('USD'),
        tiers: zod_1.z
            .array(zod_1.z.object({
            name: zod_1.z.string(),
            priceCents: zod_1.z.number().int().nonnegative(),
            limits: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        }))
            .optional(),
        revenueSharePercent: zod_1.z.number().min(0).max(100).optional(),
    }),
    deliveryMethods: zod_1.z.array(zod_1.z.enum(exports.deliveryMethods)),
    sla: zod_1.z.object({
        availabilityPercent: zod_1.z.number().min(0).max(100).default(99.9),
        latencyMs: zod_1.z.number().int().positive().optional(),
        supportTier: zod_1.z.enum(['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE']),
        refreshFrequency: zod_1.z.string().optional(),
    }),
    complianceCertifications: zod_1.z.array(zod_1.z.enum(exports.complianceFrameworks)).default([]),
    targetAudiences: zod_1.z.array(zod_1.z.string()).default([]),
    useCases: zod_1.z.array(zod_1.z.string()).default([]),
    sampleDataUrl: zod_1.z.string().url().optional(),
    documentationUrl: zod_1.z.string().url().optional(),
    status: zod_1.z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED']),
    publishedAt: zod_1.z.string().datetime().optional(),
    owner: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// CONTRACT TYPES
// ============================================================================
exports.contractStatuses = [
    'DRAFT',
    'PENDING_APPROVAL',
    'NEGOTIATION',
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED',
    'EXPIRED',
];
exports.contractTypes = [
    'DATA_LICENSE',
    'DATA_SHARING',
    'DATA_PROCESSING',
    'JOINT_CONTROLLER',
    'SUB_PROCESSOR',
];
exports.contractSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    contractNumber: zod_1.z.string(),
    type: zod_1.z.enum(exports.contractTypes),
    status: zod_1.z.enum(exports.contractStatuses),
    productId: zod_1.z.string().uuid(),
    providerId: zod_1.z.string(),
    providerName: zod_1.z.string(),
    consumerId: zod_1.z.string(),
    consumerName: zod_1.z.string(),
    terms: zod_1.z.object({
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime().optional(),
        autoRenewal: zod_1.z.boolean().default(false),
        renewalPeriodDays: zod_1.z.number().int().positive().optional(),
        terminationNoticeDays: zod_1.z.number().int().positive().default(30),
    }),
    pricing: zod_1.z.object({
        totalValueCents: zod_1.z.number().int().nonnegative(),
        currency: zod_1.z.string().length(3).default('USD'),
        paymentTerms: zod_1.z.string(),
        billingFrequency: zod_1.z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL']),
    }),
    dataRights: zod_1.z.object({
        allowedPurposes: zod_1.z.array(zod_1.z.string()),
        prohibitedUses: zod_1.z.array(zod_1.z.string()).default([]),
        geographicRestrictions: zod_1.z.array(zod_1.z.string()).default([]),
        sublicensing: zod_1.z.boolean().default(false),
        derivativeWorks: zod_1.z.boolean().default(false),
        attribution: zod_1.z.boolean().default(true),
        exclusivity: zod_1.z.boolean().default(false),
    }),
    compliance: zod_1.z.object({
        frameworks: zod_1.z.array(zod_1.z.enum(exports.complianceFrameworks)),
        dataProtectionOfficer: zod_1.z.string().optional(),
        securityMeasures: zod_1.z.array(zod_1.z.string()).default([]),
        auditRights: zod_1.z.boolean().default(true),
        breachNotificationHours: zod_1.z.number().int().positive().default(72),
    }),
    signatures: zod_1.z.array(zod_1.z.object({
        party: zod_1.z.string(),
        signedBy: zod_1.z.string(),
        signedAt: zod_1.z.string().datetime(),
        ipAddress: zod_1.z.string().optional(),
        digitalSignature: zod_1.z.string().optional(),
    })),
    amendments: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        description: zod_1.z.string(),
        effectiveDate: zod_1.z.string().datetime(),
        approvedAt: zod_1.z.string().datetime().optional(),
    }))
        .default([]),
    attachments: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string(),
        url: zod_1.z.string().url(),
        type: zod_1.z.string(),
    }))
        .default([]),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// MARKETPLACE TYPES
// ============================================================================
exports.listingStatuses = [
    'DRAFT',
    'PENDING_REVIEW',
    'ACTIVE',
    'PAUSED',
    'SOLD_OUT',
    'EXPIRED',
    'REMOVED',
];
exports.marketplaceListingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(255),
    headline: zod_1.z.string().max(200),
    description: zod_1.z.string().max(10000),
    highlights: zod_1.z.array(zod_1.z.string()).max(10).default([]),
    status: zod_1.z.enum(exports.listingStatuses),
    visibility: zod_1.z.enum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY']),
    featuredUntil: zod_1.z.string().datetime().optional(),
    analytics: zod_1.z.object({
        views: zod_1.z.number().int().nonnegative().default(0),
        inquiries: zod_1.z.number().int().nonnegative().default(0),
        purchases: zod_1.z.number().int().nonnegative().default(0),
        revenue: zod_1.z.number().nonnegative().default(0),
    }),
    ratings: zod_1.z
        .object({
        average: zod_1.z.number().min(0).max(5).default(0),
        count: zod_1.z.number().int().nonnegative().default(0),
    })
        .default({ average: 0, count: 0 }),
    media: zod_1.z
        .array(zod_1.z.object({
        type: zod_1.z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']),
        url: zod_1.z.string().url(),
        caption: zod_1.z.string().optional(),
    }))
        .default([]),
    categories: zod_1.z.array(zod_1.z.string()).default([]),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    publishedAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// REVENUE & ANALYTICS TYPES
// ============================================================================
exports.transactionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    contractId: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['PURCHASE', 'SUBSCRIPTION', 'USAGE', 'REFUND', 'ADJUSTMENT']),
    amountCents: zod_1.z.number().int(),
    currency: zod_1.z.string().length(3).default('USD'),
    status: zod_1.z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
    providerId: zod_1.z.string(),
    consumerId: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    processedAt: zod_1.z.string().datetime().optional(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
exports.revenueReportSchema = zod_1.z.object({
    period: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    }),
    totalRevenueCents: zod_1.z.number().int(),
    totalTransactions: zod_1.z.number().int(),
    byProduct: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string().uuid(),
        productName: zod_1.z.string(),
        revenueCents: zod_1.z.number().int(),
        transactions: zod_1.z.number().int(),
    })),
    byRegion: zod_1.z.array(zod_1.z.object({
        region: zod_1.z.string(),
        revenueCents: zod_1.z.number().int(),
        transactions: zod_1.z.number().int(),
    })),
    trends: zod_1.z.object({
        revenueGrowthPercent: zod_1.z.number(),
        transactionGrowthPercent: zod_1.z.number(),
        averageOrderValueCents: zod_1.z.number().int(),
    }),
});
// ============================================================================
// AI VALUATION TYPES
// ============================================================================
exports.valuationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    assetId: zod_1.z.string().uuid(),
    estimatedValueCents: zod_1.z.number().int().nonnegative(),
    confidenceScore: zod_1.z.number().min(0).max(1),
    methodology: zod_1.z.enum(['MARKET_COMPARABLE', 'COST_BASED', 'INCOME_BASED', 'AI_MODEL']),
    factors: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        weight: zod_1.z.number().min(0).max(1),
        score: zod_1.z.number().min(0).max(1),
        impact: zod_1.z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
    })),
    marketComparables: zod_1.z
        .array(zod_1.z.object({
        productId: zod_1.z.string().uuid(),
        priceCents: zod_1.z.number().int(),
        similarity: zod_1.z.number().min(0).max(1),
    }))
        .optional(),
    recommendation: zod_1.z.object({
        suggestedPriceCents: zod_1.z.number().int().nonnegative(),
        priceRangeLow: zod_1.z.number().int().nonnegative(),
        priceRangeHigh: zod_1.z.number().int().nonnegative(),
        pricingModel: zod_1.z.enum(exports.pricingModels),
        rationale: zod_1.z.string(),
    }),
    validUntil: zod_1.z.string().datetime(),
    createdAt: zod_1.z.string().datetime(),
});
// ============================================================================
// INPUT SCHEMAS FOR API
// ============================================================================
exports.createDataAssetInput = exports.dataAssetSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.createDataProductInput = exports.dataProductSchema.omit({
    id: true,
    status: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
});
exports.createContractInput = exports.contractSchema.omit({
    id: true,
    contractNumber: true,
    status: true,
    signatures: true,
    amendments: true,
    createdAt: true,
    updatedAt: true,
});
exports.complianceCheckInput = zod_1.z.object({
    assetId: zod_1.z.string().uuid(),
    frameworks: zod_1.z.array(zod_1.z.enum(exports.complianceFrameworks)),
    deepScan: zod_1.z.boolean().default(false),
});
