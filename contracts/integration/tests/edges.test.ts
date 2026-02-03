import { describe, it, expect } from 'vitest'
import {
  AssociatedWithEdgeV1,
  WorksForEdgeV1,
  OwnsEdgeV1,
  isAssociatedWith,
  isWorksFor,
  isOwns,
} from '../src/v1/edges.js'

describe('AssociatedWithEdgeV1', () => {
  it('should validate a valid ASSOCIATED_WITH edge', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'ASSOCIATED_WITH' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {
        relationshipType: 'colleague' as const,
        strength: 0.8,
        description: 'Work colleagues at Acme Corp',
        startDate: '2020-01-01',
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = AssociatedWithEdgeV1.safeParse(edge)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attributes.relationshipType).toBe('colleague')
      expect(result.data.attributes.strength).toBe(0.8)
    }
  })

  it('should apply default values for optional fields', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'ASSOCIATED_WITH' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {},
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = AssociatedWithEdgeV1.safeParse(edge)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attributes.relationshipType).toBe('unknown') // default
      expect(result.data.attributes.strength).toBe(0.5) // default
    }
  })

  it('should fail validation for strength out of range', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'ASSOCIATED_WITH' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {
        strength: 1.5, // Invalid: > 1.0
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = AssociatedWithEdgeV1.safeParse(edge)
    expect(result.success).toBe(false)
  })

  it('should fail validation for invalid relationship type', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'ASSOCIATED_WITH' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {
        relationshipType: 'invalid-type',
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = AssociatedWithEdgeV1.safeParse(edge)
    expect(result.success).toBe(false)
  })
})

describe('WorksForEdgeV1', () => {
  it('should validate a valid WORKS_FOR edge', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'WORKS_FOR' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000', // Person
      to: '323e4567-e89b-12d3-a456-426614174000', // Organization
      attributes: {
        title: 'Software Engineer',
        department: 'Engineering',
        startDate: '2020-01-01',
        isCurrent: true,
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = WorksForEdgeV1.safeParse(edge)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attributes.title).toBe('Software Engineer')
      expect(result.data.attributes.isCurrent).toBe(true)
    }
  })

  it('should apply default value for isCurrent', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'WORKS_FOR' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {},
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = WorksForEdgeV1.safeParse(edge)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attributes.isCurrent).toBe(true) // default
    }
  })
})

describe('OwnsEdgeV1', () => {
  it('should validate a valid OWNS edge', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'OWNS' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {
        ownershipPercentage: 51,
        ownershipType: 'majority' as const,
        startDate: '2020-01-01',
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = OwnsEdgeV1.safeParse(edge)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attributes.ownershipPercentage).toBe(51)
      expect(result.data.attributes.ownershipType).toBe('majority')
    }
  })

  it('should fail validation for ownership percentage > 100', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'OWNS' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {
        ownershipPercentage: 150, // Invalid: > 100
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test-source',
        confidence: 0.95,
      },
    }

    const result = OwnsEdgeV1.safeParse(edge)
    expect(result.success).toBe(false)
  })
})

describe('Edge type guards', () => {
  it('should correctly identify ASSOCIATED_WITH edges', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'ASSOCIATED_WITH' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {},
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test',
        confidence: 1.0,
      },
    }

    expect(isAssociatedWith(edge)).toBe(true)
    expect(isWorksFor(edge)).toBe(false)
    expect(isOwns(edge)).toBe(false)
  })

  it('should correctly identify WORKS_FOR edges', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'WORKS_FOR' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {},
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test',
        confidence: 1.0,
      },
    }

    expect(isWorksFor(edge)).toBe(true)
    expect(isAssociatedWith(edge)).toBe(false)
    expect(isOwns(edge)).toBe(false)
  })

  it('should correctly identify OWNS edges', () => {
    const edge = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'OWNS' as const,
      version: 'v1' as const,
      from: '223e4567-e89b-12d3-a456-426614174000',
      to: '323e4567-e89b-12d3-a456-426614174000',
      attributes: {},
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        source: 'test',
        confidence: 1.0,
      },
    }

    expect(isOwns(edge)).toBe(true)
    expect(isAssociatedWith(edge)).toBe(false)
    expect(isWorksFor(edge)).toBe(false)
  })
})
