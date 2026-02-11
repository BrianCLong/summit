/**
 * Edge Schemas v1
 * Defines canonical relationship types for the IntelGraph model
 */

import { z } from 'zod'
import { EdgeMetadataV1 } from './provenance.js'

/**
 * Relationship types for ASSOCIATED_WITH edge
 */
const RelationshipTypeV1Schema = z.enum([
  'colleague',
  'family',
  'business',
  'friend',
  'mentor',
  'advisor',
  'partner',
  'unknown',
])

export const RelationshipTypeV1 = RelationshipTypeV1Schema
export type RelationshipTypeV1 = z.infer<typeof RelationshipTypeV1Schema>

/**
 * ASSOCIATED_WITH Edge - Generic association between persons
 */
const AssociatedWithEdgeV1Schema = z.object({
  id: z.string().uuid().describe('Unique identifier (UUID v4)'),
  type: z.literal('ASSOCIATED_WITH').describe('Edge type discriminator'),
  version: z.literal('v1').describe('Schema version'),
  from: z.string().uuid().describe('Source entity ID (Person)'),
  to: z.string().uuid().describe('Target entity ID (Person)'),
  attributes: z.object({
    relationshipType: RelationshipTypeV1Schema.default('unknown').describe('Nature of the relationship'),
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

export const AssociatedWithEdgeV1 = AssociatedWithEdgeV1Schema
export type AssociatedWithEdgeV1 = z.infer<typeof AssociatedWithEdgeV1Schema>

/**
 * WORKS_FOR Edge - Person to Organization employment relationship
 */
const WorksForEdgeV1Schema = z.object({
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

export const WorksForEdgeV1 = WorksForEdgeV1Schema
export type WorksForEdgeV1 = z.infer<typeof WorksForEdgeV1Schema>

/**
 * OWNS Edge - Ownership relationship (Person/Organization to Organization)
 */
const OwnsEdgeV1Schema = z.object({
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

export const OwnsEdgeV1 = OwnsEdgeV1Schema
export type OwnsEdgeV1 = z.infer<typeof OwnsEdgeV1Schema>

/**
 * Generic Edge - Union type for all edge types
 */
const EdgeV1Schema = z.discriminatedUnion('type', [
  AssociatedWithEdgeV1Schema,
  WorksForEdgeV1Schema,
  OwnsEdgeV1Schema,
])

export const EdgeV1 = EdgeV1Schema
export type EdgeV1 = z.infer<typeof EdgeV1Schema>

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
