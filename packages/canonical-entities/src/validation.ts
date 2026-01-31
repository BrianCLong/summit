/**
 * Validation utilities for canonical entities
 */

import { z } from 'zod';
import type {
  CanonicalEntity,
  EntityType,
  ClassificationLevel,
  BitemporalFields,
} from './types';

// -----------------------------------------------------------------------------
// Base Schemas
// -----------------------------------------------------------------------------

export const ClassificationLevelSchema = z.enum([
  'UNCLASSIFIED',
  'CUI',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
]);

export const EntityTypeSchema = z.enum([
  'Person',
  'Organization',
  'Asset',
  'Location',
  'Event',
  'Document',
  'Claim',
  'Case',
]);

export const SourceReferenceSchema = z.object({
  sourceId: z.string().min(1),
  sourceRecordId: z.string().min(1),
  sourceType: z.string().min(1),
  ingestedAt: z.date(),
  sourceHash: z.string().optional(),
});

export const BitemporalFieldsSchema = z.object({
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
  observedAt: z.date().nullable(),
  recordedAt: z.date(),
});

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  canonicalId: z.string().uuid().nullable(),
  entityType: EntityTypeSchema,
  confidence: z.number().min(0).max(1),
  source: z.string().min(1),
  sources: z.array(SourceReferenceSchema),
  classification: ClassificationLevelSchema,
  compartments: z.array(z.string()),
  investigationIds: z.array(z.string().uuid()),
  tenantId: z.string().min(1),
  createdBy: z.string().min(1),
  updatedBy: z.string().nullable(),
  updatedAt: z.date().nullable(),
  props: z.record(z.unknown()),
  tags: z.array(z.string()),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
  observedAt: z.date().nullable(),
  recordedAt: z.date(),
});

// -----------------------------------------------------------------------------
// Entity-Specific Schemas
// -----------------------------------------------------------------------------

export const PersonPropsSchema = z.object({
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  dateOfBirth: z.date().optional(),
  dateOfDeath: z.date().optional(),
  nationalities: z.array(z.string()).optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  identifications: z
    .array(
      z.object({
        type: z.string(),
        value: z.string(),
        issuingCountry: z.string().optional(),
        expiryDate: z.date().optional(),
      })
    )
    .optional(),
  contacts: z
    .array(
      z.object({
        type: z.enum(['email', 'phone', 'address', 'social']),
        value: z.string(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
  occupation: z.string().optional(),
  employer: z.string().optional(),
  riskIndicators: z.array(z.string()).optional(),
  isPEP: z.boolean().optional(),
  sanctionsMatches: z.array(z.string()).optional(),
});

export const OrganizationPropsSchema = z.object({
  name: z.string().min(1),
  tradingNames: z.array(z.string()).optional(),
  orgType: z
    .enum(['corporation', 'llc', 'partnership', 'nonprofit', 'government', 'other'])
    .optional(),
  industry: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  incorporationDate: z.date().optional(),
  dissolutionDate: z.date().optional(),
  incorporationCountry: z.string().optional(),
  headquarters: z.string().optional(),
  website: z.string().url().optional(),
  employeeCount: z.number().positive().optional(),
  revenue: z
    .object({
      amount: z.number(),
      currency: z.string(),
      year: z.number(),
    })
    .optional(),
  ticker: z.string().optional(),
  lei: z.string().optional(),
  riskIndicators: z.array(z.string()).optional(),
  sanctionsMatches: z.array(z.string()).optional(),
});

// Add other entity schemas as needed...

// -----------------------------------------------------------------------------
// Validation Functions
// -----------------------------------------------------------------------------

/**
 * Validate an entity against its schema
 */
export function validateEntity(entity: unknown): {
  valid: boolean;
  errors: string[];
  entity?: CanonicalEntity;
} {
  const result = BaseEntitySchema.safeParse(entity);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  return {
    valid: true,
    errors: [],
    entity: result.data as CanonicalEntity,
  };
}

/**
 * Validate bitemporal consistency
 */
export function validateBitemporalConsistency(fields: BitemporalFields): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // validTo must be after validFrom
  if (fields.validFrom && fields.validTo && fields.validTo < fields.validFrom) {
    errors.push('validTo must be after validFrom');
  }

  // observedAt should be before or equal to recordedAt
  if (fields.observedAt && fields.observedAt > fields.recordedAt) {
    errors.push('observedAt should not be after recordedAt');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new entity with proper defaults
 */
export function createEntity<T extends EntityType>(
  entityType: T,
  props: Record<string, unknown>,
  options: {
    tenantId: string;
    createdBy: string;
    source: string;
    investigationIds?: string[];
    classification?: ClassificationLevel;
  }
): Partial<CanonicalEntity> {
  const now = new Date();

  return {
    entityType,
    props,
    confidence: 1.0,
    source: options.source,
    sources: [
      {
        sourceId: options.source,
        sourceRecordId: 'manual',
        sourceType: 'manual',
        ingestedAt: now,
      },
    ],
    classification: options.classification || 'UNCLASSIFIED',
    compartments: [],
    investigationIds: options.investigationIds || [],
    tenantId: options.tenantId,
    createdBy: options.createdBy,
    updatedBy: null,
    updatedAt: null,
    tags: [],
    validFrom: null,
    validTo: null,
    observedAt: null,
    recordedAt: now,
    canonicalId: null,
  };
}
