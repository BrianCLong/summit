/**
 * Data Monetization Engine Types
 * Comprehensive type definitions for automated data asset monetization
 */

import { z } from 'zod';

// ============================================================================
// DATA ASSET TYPES
// ============================================================================

export const dataAssetCategories = [
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
] as const;

export const dataQualityLevels = [
  'RAW',
  'CLEANSED',
  'ENRICHED',
  'CURATED',
  'CERTIFIED',
] as const;

export const sensitivityLevels = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'RESTRICTED',
  'TOP_SECRET',
] as const;

export const dataAssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.enum(dataAssetCategories),
  qualityLevel: z.enum(dataQualityLevels),
  sensitivityLevel: z.enum(sensitivityLevels),
  sourceSystem: z.string(),
  schema: z.record(z.string(), z.unknown()).optional(),
  metadata: z.object({
    recordCount: z.number().int().nonnegative().optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    lastUpdated: z.string().datetime().optional(),
    refreshFrequency: z.string().optional(),
    dataLineage: z.array(z.string()).optional(),
  }),
  tags: z.array(z.string()).default([]),
  owner: z.string(),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DataAsset = z.infer<typeof dataAssetSchema>;
export type DataAssetCategory = (typeof dataAssetCategories)[number];
export type DataQualityLevel = (typeof dataQualityLevels)[number];
export type SensitivityLevel = (typeof sensitivityLevels)[number];

// ============================================================================
// COMPLIANCE & GDPR TYPES
// ============================================================================

export const complianceFrameworks = [
  'GDPR',
  'CCPA',
  'HIPAA',
  'SOC2',
  'ISO27001',
  'FEDRAMP',
  'PCI_DSS',
  'LGPD',
  'PIPEDA',
] as const;

export const legalBasisTypes = [
  'CONSENT',
  'CONTRACT',
  'LEGAL_OBLIGATION',
  'VITAL_INTERESTS',
  'PUBLIC_TASK',
  'LEGITIMATE_INTERESTS',
] as const;

export const dataSubjectRights = [
  'ACCESS',
  'RECTIFICATION',
  'ERASURE',
  'PORTABILITY',
  'RESTRICTION',
  'OBJECTION',
  'AUTOMATED_DECISION',
] as const;

export const piiCategories = [
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
] as const;

export const complianceCheckSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  framework: z.enum(complianceFrameworks),
  status: z.enum(['PENDING', 'PASSED', 'FAILED', 'REQUIRES_REVIEW']),
  legalBasis: z.enum(legalBasisTypes).optional(),
  piiDetected: z.array(z.enum(piiCategories)).default([]),
  findings: z.array(
    z.object({
      code: z.string(),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      description: z.string(),
      recommendation: z.string().optional(),
      field: z.string().optional(),
    }),
  ),
  consentRequirements: z.array(z.string()).default([]),
  retentionPolicy: z
    .object({
      maxRetentionDays: z.number().int().positive().optional(),
      reviewDate: z.string().datetime().optional(),
      deletionRequired: z.boolean().default(false),
    })
    .optional(),
  crossBorderRestrictions: z.array(z.string()).default([]),
  anonymizationRequired: z.boolean().default(false),
  checkedAt: z.string().datetime(),
  checkedBy: z.string(),
  validUntil: z.string().datetime().optional(),
});

export type ComplianceCheck = z.infer<typeof complianceCheckSchema>;
export type ComplianceFramework = (typeof complianceFrameworks)[number];
export type LegalBasisType = (typeof legalBasisTypes)[number];
export type PIICategory = (typeof piiCategories)[number];

// ============================================================================
// DATA PRODUCT / PACKAGE TYPES
// ============================================================================

export const pricingModels = [
  'ONE_TIME',
  'SUBSCRIPTION',
  'PAY_PER_USE',
  'TIERED',
  'REVENUE_SHARE',
  'FREEMIUM',
  'AUCTION',
] as const;

export const deliveryMethods = [
  'API',
  'BULK_DOWNLOAD',
  'STREAMING',
  'DATABASE_LINK',
  'SFTP',
  'CLOUD_STORAGE',
  'EMBEDDED_ANALYTICS',
] as const;

export const accessLevels = [
  'PREVIEW',
  'SAMPLE',
  'FULL',
  'AGGREGATED',
  'ANONYMIZED',
] as const;

export const dataProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000),
  shortDescription: z.string().max(500).optional(),
  version: z.string().default('1.0.0'),
  assets: z.array(z.string().uuid()),
  category: z.enum(dataAssetCategories),
  accessLevel: z.enum(accessLevels),
  pricing: z.object({
    model: z.enum(pricingModels),
    basePriceCents: z.number().int().nonnegative(),
    currency: z.string().length(3).default('USD'),
    tiers: z
      .array(
        z.object({
          name: z.string(),
          priceCents: z.number().int().nonnegative(),
          limits: z.record(z.string(), z.number()),
        }),
      )
      .optional(),
    revenueSharePercent: z.number().min(0).max(100).optional(),
  }),
  deliveryMethods: z.array(z.enum(deliveryMethods)),
  sla: z.object({
    availabilityPercent: z.number().min(0).max(100).default(99.9),
    latencyMs: z.number().int().positive().optional(),
    supportTier: z.enum(['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE']),
    refreshFrequency: z.string().optional(),
  }),
  complianceCertifications: z.array(z.enum(complianceFrameworks)).default([]),
  targetAudiences: z.array(z.string()).default([]),
  useCases: z.array(z.string()).default([]),
  sampleDataUrl: z.string().url().optional(),
  documentationUrl: z.string().url().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED']),
  publishedAt: z.string().datetime().optional(),
  owner: z.string(),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DataProduct = z.infer<typeof dataProductSchema>;
export type PricingModel = (typeof pricingModels)[number];
export type DeliveryMethod = (typeof deliveryMethods)[number];
export type AccessLevel = (typeof accessLevels)[number];

// ============================================================================
// CONTRACT TYPES
// ============================================================================

export const contractStatuses = [
  'DRAFT',
  'PENDING_APPROVAL',
  'NEGOTIATION',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATED',
  'EXPIRED',
] as const;

export const contractTypes = [
  'DATA_LICENSE',
  'DATA_SHARING',
  'DATA_PROCESSING',
  'JOINT_CONTROLLER',
  'SUB_PROCESSOR',
] as const;

export const contractSchema = z.object({
  id: z.string().uuid(),
  contractNumber: z.string(),
  type: z.enum(contractTypes),
  status: z.enum(contractStatuses),
  productId: z.string().uuid(),
  providerId: z.string(),
  providerName: z.string(),
  consumerId: z.string(),
  consumerName: z.string(),
  terms: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    autoRenewal: z.boolean().default(false),
    renewalPeriodDays: z.number().int().positive().optional(),
    terminationNoticeDays: z.number().int().positive().default(30),
  }),
  pricing: z.object({
    totalValueCents: z.number().int().nonnegative(),
    currency: z.string().length(3).default('USD'),
    paymentTerms: z.string(),
    billingFrequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL']),
  }),
  dataRights: z.object({
    allowedPurposes: z.array(z.string()),
    prohibitedUses: z.array(z.string()).default([]),
    geographicRestrictions: z.array(z.string()).default([]),
    sublicensing: z.boolean().default(false),
    derivativeWorks: z.boolean().default(false),
    attribution: z.boolean().default(true),
    exclusivity: z.boolean().default(false),
  }),
  compliance: z.object({
    frameworks: z.array(z.enum(complianceFrameworks)),
    dataProtectionOfficer: z.string().optional(),
    securityMeasures: z.array(z.string()).default([]),
    auditRights: z.boolean().default(true),
    breachNotificationHours: z.number().int().positive().default(72),
  }),
  signatures: z.array(
    z.object({
      party: z.string(),
      signedBy: z.string(),
      signedAt: z.string().datetime(),
      ipAddress: z.string().optional(),
      digitalSignature: z.string().optional(),
    }),
  ),
  amendments: z
    .array(
      z.object({
        id: z.string().uuid(),
        description: z.string(),
        effectiveDate: z.string().datetime(),
        approvedAt: z.string().datetime().optional(),
      }),
    )
    .default([]),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        type: z.string(),
      }),
    )
    .default([]),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DataContract = z.infer<typeof contractSchema>;
export type ContractStatus = (typeof contractStatuses)[number];
export type ContractType = (typeof contractTypes)[number];

// ============================================================================
// MARKETPLACE TYPES
// ============================================================================

export const listingStatuses = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'PAUSED',
  'SOLD_OUT',
  'EXPIRED',
  'REMOVED',
] as const;

export const marketplaceListingSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  title: z.string().min(1).max(255),
  headline: z.string().max(200),
  description: z.string().max(10000),
  highlights: z.array(z.string()).max(10).default([]),
  status: z.enum(listingStatuses),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY']),
  featuredUntil: z.string().datetime().optional(),
  analytics: z.object({
    views: z.number().int().nonnegative().default(0),
    inquiries: z.number().int().nonnegative().default(0),
    purchases: z.number().int().nonnegative().default(0),
    revenue: z.number().nonnegative().default(0),
  }),
  ratings: z
    .object({
      average: z.number().min(0).max(5).default(0),
      count: z.number().int().nonnegative().default(0),
    })
    .default({ average: 0, count: 0 }),
  media: z
    .array(
      z.object({
        type: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']),
        url: z.string().url(),
        caption: z.string().optional(),
      }),
    )
    .default([]),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
});

export type MarketplaceListing = z.infer<typeof marketplaceListingSchema>;
export type ListingStatus = (typeof listingStatuses)[number];

// ============================================================================
// REVENUE & ANALYTICS TYPES
// ============================================================================

export const transactionSchema = z.object({
  id: z.string().uuid(),
  contractId: z.string().uuid(),
  productId: z.string().uuid(),
  type: z.enum(['PURCHASE', 'SUBSCRIPTION', 'USAGE', 'REFUND', 'ADJUSTMENT']),
  amountCents: z.number().int(),
  currency: z.string().length(3).default('USD'),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
  providerId: z.string(),
  consumerId: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  processedAt: z.string().datetime().optional(),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const revenueReportSchema = z.object({
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  totalRevenueCents: z.number().int(),
  totalTransactions: z.number().int(),
  byProduct: z.array(
    z.object({
      productId: z.string().uuid(),
      productName: z.string(),
      revenueCents: z.number().int(),
      transactions: z.number().int(),
    }),
  ),
  byRegion: z.array(
    z.object({
      region: z.string(),
      revenueCents: z.number().int(),
      transactions: z.number().int(),
    }),
  ),
  trends: z.object({
    revenueGrowthPercent: z.number(),
    transactionGrowthPercent: z.number(),
    averageOrderValueCents: z.number().int(),
  }),
});

export type RevenueReport = z.infer<typeof revenueReportSchema>;

// ============================================================================
// AI VALUATION TYPES
// ============================================================================

export const valuationSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  estimatedValueCents: z.number().int().nonnegative(),
  confidenceScore: z.number().min(0).max(1),
  methodology: z.enum(['MARKET_COMPARABLE', 'COST_BASED', 'INCOME_BASED', 'AI_MODEL']),
  factors: z.array(
    z.object({
      name: z.string(),
      weight: z.number().min(0).max(1),
      score: z.number().min(0).max(1),
      impact: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
    }),
  ),
  marketComparables: z
    .array(
      z.object({
        productId: z.string().uuid(),
        priceCents: z.number().int(),
        similarity: z.number().min(0).max(1),
      }),
    )
    .optional(),
  recommendation: z.object({
    suggestedPriceCents: z.number().int().nonnegative(),
    priceRangeLow: z.number().int().nonnegative(),
    priceRangeHigh: z.number().int().nonnegative(),
    pricingModel: z.enum(pricingModels),
    rationale: z.string(),
  }),
  validUntil: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type DataValuation = z.infer<typeof valuationSchema>;

// ============================================================================
// INPUT SCHEMAS FOR API
// ============================================================================

export const createDataAssetInput = dataAssetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createDataProductInput = dataProductSchema.omit({
  id: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const createContractInput = contractSchema.omit({
  id: true,
  contractNumber: true,
  status: true,
  signatures: true,
  amendments: true,
  createdAt: true,
  updatedAt: true,
});

export const complianceCheckInput = z.object({
  assetId: z.string().uuid(),
  frameworks: z.array(z.enum(complianceFrameworks)),
  deepScan: z.boolean().default(false),
});

export type CreateDataAssetInput = z.infer<typeof createDataAssetInput>;
export type CreateDataProductInput = z.infer<typeof createDataProductInput>;
export type CreateContractInput = z.infer<typeof createContractInput>;
export type ComplianceCheckInput = z.infer<typeof complianceCheckInput>;
