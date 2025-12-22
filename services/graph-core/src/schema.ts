import { z } from 'zod';

export const EntityType = z.enum([
  'Person',
  'Org',
  'Asset',
  'Account',
  'Location',
  'Event',
  'Document',
  'Communication',
  'Device',
  'Vehicle',
  'FinancialInstrument',
  'Infrastructure',
  'Claim',
  'Indicator',
  'Case',
]);

export const PolicyTags = z.object({
  origin: z.string().optional(),
  sensitivity: z.string().optional(),
  clearance: z.string().optional(),
  legalBasis: z.string().optional(),
  needToKnow: z.string().optional(),
});

export const EntityBaseSchema = z.object({
  id: z.string().uuid().optional(),
  type: EntityType,
  attributes: z.record(z.string(), z.any()).default({}),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  policy: PolicyTags.optional(),
});

export const EntitySchema = EntityBaseSchema;

export const RelationshipBaseSchema = z.object({
  id: z.string().uuid().optional(),
  from: z.string().uuid(),
  to: z.string().uuid(),
  type: z.string(),
  attributes: z.record(z.string(), z.any()).default({}),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  policy: PolicyTags.optional(),
});

export const RelationshipSchema = RelationshipBaseSchema;

export type Entity = z.infer<typeof EntitySchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
