/**
 * Entity Schemas v1
 * Defines canonical entity types for the IntelGraph model
 */

import { z } from 'zod'
import { EntityMetadataV1 } from './provenance.js'

/**
 * Person Entity - Represents an individual person
 */
export const PersonEntityV1 = z.object({
  id: z.string().uuid().describe('Unique identifier (UUID v4)'),
  type: z.literal('Person').describe('Entity type discriminator'),
  version: z.literal('v1').describe('Schema version'),
  attributes: z.object({
    name: z.string().min(1).max(500).describe('Full name of the person'),
    email: z.string().email().max(255).optional().describe('Email address'),
    phone: z.string().max(50).optional().describe('Phone number'),
    title: z.string().max(200).optional().describe('Job title or role'),
    organization: z.string().max(500).optional().describe('Organization name'),
    location: z.string().max(500).optional().describe('Geographic location'),
    bio: z.string().max(5000).optional().describe('Biographical information'),
  }),
  metadata: EntityMetadataV1.describe('Lifecycle and provenance metadata'),
})

export type PersonEntityV1 = z.infer<typeof PersonEntityV1>

/**
 * Organization Entity - Represents a company or organization
 */
export const OrganizationEntityV1 = z.object({
  id: z.string().uuid().describe('Unique identifier (UUID v4)'),
  type: z.literal('Organization').describe('Entity type discriminator'),
  version: z.literal('v1').describe('Schema version'),
  attributes: z.object({
    name: z.string().min(1).max(500).describe('Organization name'),
    legalName: z.string().max(500).optional().describe('Legal business name'),
    website: z.string().url().optional().describe('Primary website URL'),
    domain: z.string().max(255).optional().describe('Email domain'),
    industry: z.string().max(200).optional().describe('Industry classification'),
    size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
    location: z.string().max(500).optional().describe('Headquarters location'),
    description: z.string().max(5000).optional().describe('Organization description'),
  }),
  metadata: EntityMetadataV1.describe('Lifecycle and provenance metadata'),
})

export type OrganizationEntityV1 = z.infer<typeof OrganizationEntityV1>

/**
 * Generic Entity - Union type for all entity types
 */
export const EntityV1 = z.discriminatedUnion('type', [
  PersonEntityV1,
  OrganizationEntityV1,
])

export type EntityV1 = z.infer<typeof EntityV1>

/**
 * Entity type helper for narrowing
 */
export function isPerson(entity: EntityV1): entity is PersonEntityV1 {
  return entity.type === 'Person'
}

export function isOrganization(entity: EntityV1): entity is OrganizationEntityV1 {
  return entity.type === 'Organization'
}
