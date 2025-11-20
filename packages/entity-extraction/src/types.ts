import { z } from 'zod';

/**
 * Entity types
 */
export const EntityKind = z.enum([
  'Person',
  'Org',
  'Location',
  'Event',
  'Document',
  'Indicator',
  'Case',
  'Claim',
  'Date',
  'Money',
  'PhoneNumber',
  'Email',
  'URL',
  'IPAddress',
  'Domain'
]);

export type EntityKind = z.infer<typeof EntityKind>;

/**
 * Extracted entity
 */
export const ExtractedEntity = z.object({
  id: z.string().uuid().optional(),
  kind: EntityKind,
  text: z.string(),
  normalizedText: z.string().optional(),
  confidence: z.number().min(0).max(1),
  span: z.object({
    start: z.number(),
    end: z.number()
  }),
  attributes: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type ExtractedEntity = z.infer<typeof ExtractedEntity>;

/**
 * Relationship types
 */
export const RelationshipType = z.enum([
  'relatesTo',
  'locatedAt',
  'participatesIn',
  'derivedFrom',
  'mentions',
  'contradicts',
  'supports',
  'enrichedFrom',
  'employedBy',
  'memberOf',
  'ownedBy',
  'partOf',
  'causes',
  'follows',
  'precedes'
]);

export type RelationshipType = z.infer<typeof RelationshipType>;

/**
 * Inferred relationship
 */
export const InferredRelationship = z.object({
  id: z.string().uuid().optional(),
  type: RelationshipType,
  sourceEntityId: z.string(),
  targetEntityId: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().optional(),
  attributes: z.record(z.unknown()).optional()
});

export type InferredRelationship = z.infer<typeof InferredRelationship>;

/**
 * Extraction result
 */
export const ExtractionResult = z.object({
  entities: z.array(ExtractedEntity),
  relationships: z.array(InferredRelationship),
  text: z.string(),
  metadata: z.record(z.unknown()).optional()
});

export type ExtractionResult = z.infer<typeof ExtractionResult>;

/**
 * Extraction configuration
 */
export interface ExtractionConfig {
  extractPersons?: boolean;
  extractOrganizations?: boolean;
  extractLocations?: boolean;
  extractDates?: boolean;
  extractMoney?: boolean;
  extractContacts?: boolean; // emails, phone numbers
  extractIndicators?: boolean; // IPs, domains, URLs
  minConfidence?: number;
  inferRelationships?: boolean;
  deduplicateEntities?: boolean;
}
