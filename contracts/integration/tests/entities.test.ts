import { describe, it, expect } from 'vitest'
import { PersonEntityV1, OrganizationEntityV1, isPerson, isOrganization } from '../src/v1/entities.js'

describe('PersonEntityV1', () => {
  it('should validate a valid person entity', () => {
    const person = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'Person' as const,
      version: 'v1' as const,
      attributes: {
        name: 'Alice Smith',
        email: 'alice@example.com',
        phone: '+1-555-1234',
        title: 'Software Engineer',
        organization: 'Acme Corp',
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
        version: 1,
      },
    }

    const result = PersonEntityV1.safeParse(person)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attributes.name).toBe('Alice Smith')
      expect(result.data.metadata.confidence).toBe(0.95)
    }
  })

  it('should fail validation for invalid email', () => {
    const person = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'Person' as const,
      version: 'v1' as const,
      attributes: {
        name: 'Alice Smith',
        email: 'not-an-email',
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = PersonEntityV1.safeParse(person)
    expect(result.success).toBe(false)
  })

  it('should fail validation for confidence out of range', () => {
    const person = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'Person' as const,
      version: 'v1' as const,
      attributes: {
        name: 'Alice Smith',
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 1.5, // Invalid: > 1.0
      },
    }

    const result = PersonEntityV1.safeParse(person)
    expect(result.success).toBe(false)
  })

  it('should allow optional fields to be omitted', () => {
    const person = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'Person' as const,
      version: 'v1' as const,
      attributes: {
        name: 'Alice Smith',
        // email, phone, title, organization all optional
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = PersonEntityV1.safeParse(person)
    expect(result.success).toBe(true)
  })
})

describe('OrganizationEntityV1', () => {
  it('should validate a valid organization entity', () => {
    const org = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'Organization' as const,
      version: 'v1' as const,
      attributes: {
        name: 'Acme Corp',
        legalName: 'Acme Corporation Inc.',
        website: 'https://acme.com',
        domain: 'acme.com',
        industry: 'Technology',
        size: '51-200' as const,
        location: 'San Francisco, CA',
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = OrganizationEntityV1.safeParse(org)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attributes.name).toBe('Acme Corp')
      expect(result.data.attributes.size).toBe('51-200')
    }
  })

  it('should fail validation for invalid website URL', () => {
    const org = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'Organization' as const,
      version: 'v1' as const,
      attributes: {
        name: 'Acme Corp',
        website: 'not-a-url',
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = OrganizationEntityV1.safeParse(org)
    expect(result.success).toBe(false)
  })

  it('should fail validation for invalid size enum', () => {
    const org = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'Organization' as const,
      version: 'v1' as const,
      attributes: {
        name: 'Acme Corp',
        size: 'huge', // Invalid enum value
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = OrganizationEntityV1.safeParse(org)
    expect(result.success).toBe(false)
  })
})

describe('Entity type guards', () => {
  it('should correctly identify Person entities', () => {
    const person = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'Person' as const,
      version: 'v1' as const,
      attributes: { name: 'Alice' },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'test',
        confidence: 1.0,
      },
    }

    expect(isPerson(person)).toBe(true)
    expect(isOrganization(person)).toBe(false)
  })

  it('should correctly identify Organization entities', () => {
    const org = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'Organization' as const,
      version: 'v1' as const,
      attributes: { name: 'Acme Corp' },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'test',
        confidence: 1.0,
      },
    }

    expect(isOrganization(org)).toBe(true)
    expect(isPerson(org)).toBe(false)
  })
})
