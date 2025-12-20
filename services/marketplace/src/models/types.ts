import { z } from 'zod';

// Enums
export const DataCategory = z.enum([
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

export const RiskLevel = z.enum(['low', 'medium', 'high', 'critical']);

export const Classification = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
  'top_secret',
]);

export const Regulation = z.enum([
  'GDPR',
  'CCPA',
  'HIPAA',
  'SOX',
  'PCI_DSS',
  'FERPA',
  'GLBA',
]);

export const LicenseType = z.enum([
  'single_use',
  'unlimited',
  'time_limited',
  'usage_based',
  'enterprise',
]);

export const TransactionStatus = z.enum([
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

export const ConsentPurpose = z.enum([
  'analytics',
  'research',
  'marketing',
  'ai_training',
  'resale',
  'internal_use',
]);

// Data Product Schema
export const DataProductSchema = z.object({
  id: z.string().uuid(),
  providerId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: DataCategory,
  tags: z.array(z.string()),
  schemaDefinition: z.record(z.any()),
  rowCount: z.number().int().positive().optional(),
  sizeBytes: z.number().int().positive().optional(),
  lastUpdated: z.date().optional(),
  updateFrequency: z.string().optional(),
  qualityScore: z.number().int().min(0).max(100).optional(),
  completeness: z.number().min(0).max(100).optional(),
  accuracy: z.number().min(0).max(100).optional(),
  riskScore: z.number().int().min(0).max(100).optional(),
  riskLevel: RiskLevel.optional(),
  classification: Classification,
  piiFields: z.array(z.string()),
  regulations: z.array(Regulation),
  pricingModel: z.string(),
  basePriceCents: z.number().int().positive(),
  currency: z.string().default('USD'),
  status: z.string().default('draft'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DataProduct = z.infer<typeof DataProductSchema>;

// Create Product Input
export const CreateProductInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: DataCategory,
  tags: z.array(z.string()).default([]),
  schemaDefinition: z.record(z.any()),
  classification: Classification,
  piiFields: z.array(z.string()).default([]),
  regulations: z.array(Regulation).default([]),
  pricingModel: z.string(),
  basePriceCents: z.number().int().positive(),
  currency: z.string().default('USD'),
});

export type CreateProductInputType = z.infer<typeof CreateProductInput>;

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  productId: z.string().uuid(),
  agreedPriceCents: z.number().int().positive(),
  platformFeeCents: z.number().int(),
  sellerPayoutCents: z.number().int(),
  currency: z.string().default('USD'),
  licenseType: LicenseType,
  usageTerms: z.record(z.any()),
  durationDays: z.number().int().positive().optional(),
  status: TransactionStatus,
  consentVerified: z.boolean().default(false),
  complianceChecked: z.boolean().default(false),
  contractHash: z.string().optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  expiresAt: z.date().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Consent Record Schema
export const ConsentRecordSchema = z.object({
  id: z.string().uuid(),
  dataSubjectId: z.string(),
  productId: z.string().uuid().optional(),
  providerId: z.string().uuid(),
  purposes: z.array(ConsentPurpose),
  scope: z.record(z.any()),
  grantedAt: z.date(),
  expiresAt: z.date().optional(),
  revokedAt: z.date().optional(),
  revocationReason: z.string().optional(),
  consentMethod: z.enum(['explicit', 'opt-in', 'contractual']),
  evidenceHash: z.string(),
  version: z.number().int().default(1),
  createdAt: z.date(),
});

export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

// Risk Assessment Schema
export const RiskAssessmentSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  overallScore: z.number().int().min(0).max(100),
  riskLevel: RiskLevel,
  piiScore: z.number().int().min(0).max(100).optional(),
  sensitivityScore: z.number().int().min(0).max(100).optional(),
  regulatoryScore: z.number().int().min(0).max(100).optional(),
  reputationScore: z.number().int().min(0).max(100).optional(),
  technicalScore: z.number().int().min(0).max(100).optional(),
  findings: z.record(z.any()),
  recommendations: z.array(z.string()),
  automatedChecks: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      details: z.string(),
    })
  ),
  assessedAt: z.date(),
  assessedBy: z.string(),
});

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

// Data Provider Schema
export const DataProviderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['individual', 'organization', 'government']),
  verified: z.boolean().default(false),
  verificationDate: z.date().optional(),
  rating: z.number().min(0).max(5).optional(),
  totalTransactions: z.number().int().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DataProvider = z.infer<typeof DataProviderSchema>;
