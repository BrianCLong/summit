/**
 * Edge Schemas v1
 * Defines canonical relationship types for the IntelGraph model
 */

import { z } from 'zod'
import { EdgeMetadataV1 } from './provenance.js'

/**
 * Relationship types for ASSOCIATED_WITH edge
 */
export const RelationshipTypeV1 = z.enum([
  'colleague',
  'family',
  'business',
  'friend',
  'mentor',
  'advisor',
  'partner',
  'unknown',
])

export type RelationshipTypeV1 = z.infer<typeof RelationshipTypeV1>

/**
 * ASSOCIATED_WITH Edge - Generic association between persons
 */
export const AssociatedWithEdgeV1 = z.object({
  id: z.string().uuid().describe('Unique identifier (UUID v4)'),
  type: z.literal('ASSOCIATED_WITH').describe('Edge type discriminator'),
  version: z.literal('v1').describe('Schema version'),
  from: z.string().uuid().describe('Source entity ID (Person)'),
  to: z.string().uuid().describe('Target entity ID (Person)'),
  attributes: z.object({
    relationshipType: RelationshipTypeV1.default('unknown').describe('Nature of the relationship'),
    strength: z
      .number()
      .min(0)
      .max(1)
      .default(0.5)
      .describe('Relationship strength (0.0 = weak, 1.0 = strong)'),
    description: z.string().max(1000).optional().describe('Description of the relationship'),
    startDate: z.string().date().optional().describe('When the relationship started (YYYY-MM-DD)'),
    endDate: z.string().date().optional().describe('When the relationship ended (YYYY-MM-DD)'),
  }),
  metadata: EdgeMetadataV1.describe('Provenance and confidence metadata'),
})

export type AssociatedWithEdgeV1 = z.infer<typeof AssociatedWithEdgeV1>

/**
 * WORKS_FOR Edge - Person to Organization employment relationship
 */
export const WorksForEdgeV1 = z.object({
  id: z.string().uuid().describe('Unique identifier (UUID v4)'),
  type: z.literal('WORKS_FOR').describe('Edge type discriminator'),
  version: z.literal('v1').describe('Schema version'),
  from: z.string().uuid().describe('Person entity ID'),
  to: z.string().uuid().describe('Organization entity ID'),
  attributes: z.object({
    title: z.string().max(200).optional().describe('Job title'),
    department: z.string().max(200).optional().describe('Department or team'),
    startDate: z.string().date().optional().describe('Employment start date (YYYY-MM-DD)'),
    endDate: z.string().date().optional().describe('Employment end date (YYYY-MM-DD)'),
    isCurrent: z.boolean().default(true).describe('Whether this is current employment'),
  }),
  metadata: EdgeMetadataV1.describe('Provenance and confidence metadata'),
})

export type WorksForEdgeV1 = z.infer<typeof WorksForEdgeV1>

/**
 * OWNS Edge - Ownership relationship (Person/Organization to Organization)
 */
export const OwnsEdgeV1 = z.object({
  id: z.string().uuid().describe('Unique identifier (UUID v4)'),
  type: z.literal('OWNS').describe('Edge type discriminator'),
  version: z.literal('v1').describe('Schema version'),
  from: z.string().uuid().describe('Owner entity ID (Person or Organization)'),
  to: z.string().uuid().describe('Owned entity ID (Organization)'),
  attributes: z.object({
    ownershipPercentage: z.number().min(0).max(100).optional().describe('Percentage owned'),
    ownershipType: z.enum(['full', 'partial', 'majority', 'minority', 'unknown']).default('unknown'),
    startDate: z.string().date().optional().describe('Ownership start date (YYYY-MM-DD)'),
  }),
  metadata: EdgeMetadataV1.describe('Provenance and confidence metadata'),
})

export type OwnsEdgeV1 = z.infer<typeof OwnsEdgeV1>

/**
 * Generic Edge - Union type for all edge types
 */
export const EdgeV1 = z.discriminatedUnion('type', [
  AssociatedWithEdgeV1,
  WorksForEdgeV1,
  OwnsEdgeV1,
])

export type EdgeV1 = z.infer<typeof EdgeV1>

/**
 * Edge type helpers for narrowing
 */
export function isAssociatedWith(edge: EdgeV1): edge is AssociatedWithEdgeV1 {
  return edge.type === 'ASSOCIATED_WITH'
}

export function isWorksFor(edge: EdgeV1): edge is WorksForEdgeV1 {
  return edge.type === 'WORKS_FOR'
}

export function isOwns(edge: EdgeV1): edge is OwnsEdgeV1 {
  return edge.type === 'OWNS'
}
