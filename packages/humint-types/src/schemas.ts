/**
 * HUMINT Zod Validation Schemas
 *
 * Type-safe validation for all HUMINT operations.
 */

import { z } from 'zod';
import {
  SOURCE_TYPES,
  SOURCE_STATUS,
  CREDIBILITY_RATINGS,
  INFORMATION_RATINGS,
  ACCESS_TYPES,
  RISK_LEVELS,
  CLASSIFICATION_LEVELS,
  HANDLING_CAVEATS,
  DEBRIEF_TYPES,
  DEBRIEF_STATUS,
} from './constants.js';

// ============================================================================
// Primitive Schemas
// ============================================================================

export const SourceTypeSchema = z.enum(
  Object.keys(SOURCE_TYPES) as [string, ...string[]],
);

export const SourceStatusSchema = z.enum(
  Object.keys(SOURCE_STATUS) as [string, ...string[]],
);

export const CredibilityRatingSchema = z.enum(
  Object.keys(CREDIBILITY_RATINGS) as [string, ...string[]],
);

export const InformationRatingSchema = z.enum(
  Object.keys(INFORMATION_RATINGS) as [string, ...string[]],
);

export const AccessTypeSchema = z.enum(
  Object.keys(ACCESS_TYPES) as [string, ...string[]],
);

export const RiskLevelSchema = z.enum(
  Object.keys(RISK_LEVELS) as [string, ...string[]],
);

export const ClassificationLevelSchema = z.enum(
  Object.keys(CLASSIFICATION_LEVELS) as [string, ...string[]],
);

export const HandlingCaveatSchema = z.enum(
  Object.keys(HANDLING_CAVEATS) as [string, ...string[]],
);

export const DebriefTypeSchema = z.enum(
  Object.keys(DEBRIEF_TYPES) as [string, ...string[]],
);

export const DebriefStatusSchema = z.enum(
  Object.keys(DEBRIEF_STATUS) as [string, ...string[]],
);

// ============================================================================
// Composite Schemas
// ============================================================================

export const PolicyLabelsSchema = z.object({
  classification: ClassificationLevelSchema,
  caveats: z.array(HandlingCaveatSchema),
  releasableTo: z.array(z.string().min(1)),
  originatorControl: z.boolean(),
  legalBasis: z.string().min(1),
  needToKnow: z.array(z.string().min(1)),
  retentionPeriod: z.number().int().positive(),
  expirationDate: z.coerce.date().optional(),
});

export const ContactMethodSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'SECURE_PHONE',
    'DEAD_DROP',
    'BRUSH_PASS',
    'SIGNAL',
    'EMAIL',
    'IN_PERSON',
    'VIRTUAL',
  ]),
  identifier: z.string().min(1),
  protocol: z.string().min(1),
  scheduleWindow: z
    .object({
      timezone: z.string(),
      dayOfWeek: z.array(z.number().int().min(0).max(6)),
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
    })
    .optional(),
  isActive: z.boolean(),
  lastUsed: z.coerce.date().optional(),
});

export const CoverIdentitySchema = z.object({
  id: z.string().uuid(),
  alias: z.string().min(1).max(100),
  documentation: z.array(z.string()),
  backstory: z.string().min(1),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional(),
  isCompromised: z.boolean().default(false),
});

export const AccessCapabilitySchema = z.object({
  type: AccessTypeSchema,
  target: z.string().min(1),
  targetType: z.enum([
    'PERSON',
    'ORGANIZATION',
    'LOCATION',
    'SYSTEM',
    'DOCUMENT',
  ]),
  level: z.enum(['FULL', 'PARTIAL', 'LIMITED', 'HISTORICAL']),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional(),
  reliability: z.number().min(0).max(100),
  lastVerified: z.coerce.date().optional(),
});

export const CompensationSchema = z.object({
  type: z.enum([
    'SALARY',
    'STIPEND',
    'PER_REPORT',
    'EXPENSES_ONLY',
    'NONE',
  ]),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  frequency: z
    .enum(['MONTHLY', 'QUARTERLY', 'PER_MEETING', 'AD_HOC'])
    .optional(),
});

// ============================================================================
// Source CRUD Schemas
// ============================================================================

/**
 * Schema for creating a new HUMINT source
 */
export const CreateSourceSchema = z.object({
  cryptonym: z
    .string()
    .min(3)
    .max(50)
    .regex(
      /^[A-Z][A-Z0-9_-]*$/,
      'Cryptonym must start with letter and contain only uppercase letters, numbers, hyphens, and underscores',
    ),
  sourceType: SourceTypeSchema,
  handlerId: z.string().uuid(),
  alternateHandlerId: z.string().uuid().optional(),
  credibilityRating: CredibilityRatingSchema.default('F'),
  riskLevel: RiskLevelSchema.default('MODERATE'),
  areaOfOperation: z.array(z.string().min(1)).min(1),
  topicalAccess: z.array(z.string().min(1)),
  accessCapabilities: z.array(AccessCapabilitySchema).optional().default([]),
  contactMethods: z.array(ContactMethodSchema).min(1),
  coverIdentities: z.array(CoverIdentitySchema).optional().default([]),
  recruitmentDate: z.coerce.date(),
  languages: z.array(z.string().min(2).max(50)),
  specialCapabilities: z.array(z.string()).optional().default([]),
  compensation: CompensationSchema,
  motivationFactors: z.array(z.string().min(1)),
  vulnerabilities: z.array(z.string()).optional().default([]),
  policyLabels: PolicyLabelsSchema,
  notes: z.string().optional().default(''),
});

/**
 * Schema for updating an existing source
 */
export const UpdateSourceSchema = CreateSourceSchema.partial().extend({
  id: z.string().uuid(),
  status: SourceStatusSchema.optional(),
  credibilityScore: z.number().min(0).max(100).optional(),
  credibilityTrend: z
    .enum(['IMPROVING', 'STABLE', 'DECLINING'])
    .optional(),
  nextScheduledContact: z.coerce.date().optional(),
  personEntityId: z.string().uuid().optional(),
});

/**
 * Schema for source search criteria
 */
export const SourceSearchCriteriaSchema = z.object({
  cryptonym: z.string().optional(),
  sourceTypes: z.array(SourceTypeSchema).optional(),
  statuses: z.array(SourceStatusSchema).optional(),
  handlerId: z.string().uuid().optional(),
  minCredibilityScore: z.number().min(0).max(100).optional(),
  maxCredibilityScore: z.number().min(0).max(100).optional(),
  credibilityRatings: z.array(CredibilityRatingSchema).optional(),
  riskLevels: z.array(RiskLevelSchema).optional(),
  areasOfOperation: z.array(z.string()).optional(),
  topicalAccess: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  hasRecentContact: z.boolean().optional(),
  recentContactDays: z.number().int().positive().optional(),
  classification: ClassificationLevelSchema.optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z
    .enum(['cryptonym', 'credibilityScore', 'lastContactDate', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// Handler Schemas
// ============================================================================

export const CreateHandlerSchema = z.object({
  name: z.string().min(1).max(100),
  employeeId: z.string().min(1),
  clearanceLevel: ClassificationLevelSchema,
  maxSourceCapacity: z.number().int().positive().default(10),
  specializations: z.array(z.string()),
  languages: z.array(z.string()),
  region: z.string().min(1),
  supervisorId: z.string().uuid(),
});

export const UpdateHandlerSchema = CreateHandlerSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// Tasking Schemas
// ============================================================================

export const CreateTaskingSchema = z.object({
  sourceId: z.string().uuid(),
  requirementId: z.string().uuid(),
  taskDescription: z.string().min(10).max(5000),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  deadline: z.coerce.date().optional(),
  policyLabels: PolicyLabelsSchema,
});

export const UpdateTaskingSchema = z.object({
  id: z.string().uuid(),
  status: z
    .enum([
      'ASSIGNED',
      'ACKNOWLEDGED',
      'IN_PROGRESS',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
    ])
    .optional(),
  result: z.string().optional(),
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a cryptonym format
 */
export function validateCryptonym(cryptonym: string): boolean {
  return /^[A-Z][A-Z0-9_-]{2,49}$/.test(cryptonym);
}

/**
 * Calculate composite credibility score
 */
export function calculateCredibilityScore(
  sourceRating: keyof typeof CREDIBILITY_RATINGS,
  infoRating: keyof typeof INFORMATION_RATINGS,
  corroborationPercentage: number,
): number {
  const sourceScore = CREDIBILITY_RATINGS[sourceRating].score;
  const infoScore = INFORMATION_RATINGS[infoRating].score;

  // Weighted calculation: 40% source reliability, 40% info reliability, 20% corroboration
  return Math.round(
    sourceScore * 0.4 + infoScore * 0.4 + corroborationPercentage * 0.2,
  );
}

/**
 * Determine if source needs contact based on last contact date
 */
export function isContactOverdue(
  lastContactDate: Date | undefined,
  thresholdDays: number = 30,
): boolean {
  if (!lastContactDate) return true;
  const daysSinceContact = Math.floor(
    (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysSinceContact > thresholdDays;
}

// Export inferred types from schemas
export type CreateSourceInput = z.infer<typeof CreateSourceSchema>;
export type UpdateSourceInput = z.infer<typeof UpdateSourceSchema>;
export type SourceSearchInput = z.infer<typeof SourceSearchCriteriaSchema>;
export type CreateHandlerInput = z.infer<typeof CreateHandlerSchema>;
export type UpdateHandlerInput = z.infer<typeof UpdateHandlerSchema>;
export type CreateTaskingInput = z.infer<typeof CreateTaskingSchema>;
export type UpdateTaskingInput = z.infer<typeof UpdateTaskingSchema>;
export type PolicyLabelsInput = z.infer<typeof PolicyLabelsSchema>;
