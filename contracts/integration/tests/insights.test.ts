import { describe, it, expect } from 'vitest'
import {
  CreatePersonNetworkInsightRequestV1,
  CreatePersonNetworkInsightResponseV1,
  GetInsightResponseV1,
  ListInsightsRequestV1,
  ListInsightsResponseV1,
  InsightStatusV1,
  InsightTypeV1,
} from '../src/v1/insights.js'

describe('CreatePersonNetworkInsightRequestV1', () => {
  it('should validate valid insight creation request', () => {
    const request = {
      version: 'v1' as const,
      personId: '123e4567-e89b-12d3-a456-426614174000',
      depth: 2,
      options: {
        includeAnalysis: true,
        maxNetworkSize: 100,
        relationshipTypes: ['colleague', 'business'] as const,
      },
      metadata: {
        requestedBy: 'user@example.com',
        correlationId: '223e4567-e89b-12d3-a456-426614174000',
      },
    }

    const result = CreatePersonNetworkInsightRequestV1.safeParse(request)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.depth).toBe(2)
      expect(result.data.options?.includeAnalysis).toBe(true)
    }
  })

  it('should apply default depth', () => {
    const request = {
      version: 'v1' as const,
      personId: '123e4567-e89b-12d3-a456-426614174000',
    }

    const result = CreatePersonNetworkInsightRequestV1.safeParse(request)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.depth).toBe(2) // default
    }
  })

  it('should fail validation for depth out of range', () => {
    const request = {
      version: 'v1' as const,
      personId: '123e4567-e89b-12d3-a456-426614174000',
      depth: 5, // Invalid: > 3
    }

    const result = CreatePersonNetworkInsightRequestV1.safeParse(request)
    expect(result.success).toBe(false)
  })

  it('should fail validation for invalid person ID', () => {
    const request = {
      version: 'v1' as const,
      personId: 'not-a-uuid',
      depth: 2,
    }

    const result = CreatePersonNetworkInsightRequestV1.safeParse(request)
    expect(result.success).toBe(false)
  })
})

describe('CreatePersonNetworkInsightResponseV1', () => {
  it('should validate completed insight response with data', () => {
    const response = {
      version: 'v1' as const,
      insightId: '323e4567-e89b-12d3-a456-426614174000',
      type: 'person-network' as const,
      status: 'completed' as const,
      data: {
        person: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: 'Person' as const,
          version: 'v1' as const,
          attributes: {
            name: 'Alice Smith',
            email: 'alice@example.com',
          },
          metadata: {
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            source: 'test-source',
            confidence: 0.95,
          },
        },
        network: {
          size: 25,
          associations: [],
          clusters: [
            {
              id: 'cluster-1',
              size: 15,
              dominantRelationshipType: 'colleague',
            },
            {
              id: 'cluster-2',
              size: 10,
              dominantRelationshipType: 'business',
            },
          ],
        },
        summary: 'Alice Smith has a network of 25 connections across 2 clusters.',
        insights: {
          strongConnections: 8,
          weakConnections: 5,
          keyConnectors: [
            {
              personId: '423e4567-e89b-12d3-a456-426614174000',
              personName: 'Bob Jones',
              connectionCount: 12,
            },
          ],
          riskFactors: ['High concentration in single organization'],
        },
      },
      metadata: {
        generatedAt: '2024-01-01T00:00:05Z',
        maestroRunId: '523e4567-e89b-12d3-a456-426614174000',
        processingTimeMs: 5000,
        requestedBy: 'user@example.com',
      },
    }

    const result = CreatePersonNetworkInsightResponseV1.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('completed')
      expect(result.data.data?.network.size).toBe(25)
      expect(result.data.data?.network.clusters).toHaveLength(2)
      expect(result.data.data?.insights?.keyConnectors).toHaveLength(1)
    }
  })

  it('should validate pending insight response without data', () => {
    const response = {
      version: 'v1' as const,
      insightId: '323e4567-e89b-12d3-a456-426614174000',
      type: 'person-network' as const,
      status: 'pending' as const,
      metadata: {
        generatedAt: '2024-01-01T00:00:00Z',
        maestroRunId: '523e4567-e89b-12d3-a456-426614174000',
      },
    }

    const result = CreatePersonNetworkInsightResponseV1.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('pending')
      expect(result.data.data).toBeUndefined()
    }
  })

  it('should validate failed insight response with error', () => {
    const response = {
      version: 'v1' as const,
      insightId: '323e4567-e89b-12d3-a456-426614174000',
      type: 'person-network' as const,
      status: 'failed' as const,
      error: 'Workflow execution failed: person not found',
      metadata: {
        generatedAt: '2024-01-01T00:00:00Z',
        maestroRunId: '523e4567-e89b-12d3-a456-426614174000',
        processingTimeMs: 1000,
      },
    }

    const result = CreatePersonNetworkInsightResponseV1.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('failed')
      expect(result.data.error).toBeDefined()
    }
  })

  it('should validate all insight statuses', () => {
    const statuses: Array<typeof InsightStatusV1._type> = ['pending', 'generating', 'completed', 'failed']

    statuses.forEach((status) => {
      const response = {
        version: 'v1' as const,
        insightId: '323e4567-e89b-12d3-a456-426614174000',
        type: 'person-network' as const,
        status,
        metadata: {
          generatedAt: '2024-01-01T00:00:00Z',
          maestroRunId: '523e4567-e89b-12d3-a456-426614174000',
        },
      }

      const result = CreatePersonNetworkInsightResponseV1.safeParse(response)
      expect(result.success).toBe(true)
    })
  })
})

describe('GetInsightResponseV1', () => {
  it('should validate generic insight response', () => {
    const response = {
      version: 'v1' as const,
      insightId: '323e4567-e89b-12d3-a456-426614174000',
      type: 'person-network' as const,
      status: 'completed' as const,
      data: {
        arbitrary: 'data',
        structure: 'allowed',
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:05Z',
        completedAt: '2024-01-01T00:00:05Z',
        requestedBy: 'user@example.com',
      },
    }

    const result = GetInsightResponseV1.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('should validate all insight types', () => {
    const types: Array<typeof InsightTypeV1._type> = [
      'person-network',
      'organization-network',
      'relationship-analysis',
      'risk-assessment',
      'entity-summary',
    ]

    types.forEach((type) => {
      const response = {
        version: 'v1' as const,
        insightId: '323e4567-e89b-12d3-a456-426614174000',
        type,
        status: 'completed' as const,
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }

      const result = GetInsightResponseV1.safeParse(response)
      expect(result.success).toBe(true)
    })
  })
})

describe('ListInsightsRequestV1', () => {
  it('should validate list request with filters', () => {
    const request = {
      version: 'v1' as const,
      filters: {
        type: 'person-network' as const,
        status: 'completed' as const,
        requestedBy: 'user@example.com',
        createdAfter: '2024-01-01T00:00:00Z',
        createdBefore: '2024-12-31T23:59:59Z',
      },
      pagination: {
        limit: 50,
        offset: 0,
      },
    }

    const result = ListInsightsRequestV1.safeParse(request)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.filters?.type).toBe('person-network')
      expect(result.data.pagination?.limit).toBe(50)
    }
  })

  it('should apply default pagination values when pagination object is provided', () => {
    const request = {
      version: 'v1' as const,
      pagination: {},
    }

    const result = ListInsightsRequestV1.safeParse(request)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pagination?.limit).toBe(20) // default
      expect(result.data.pagination?.offset).toBe(0) // default
    }
  })

  it('should validate request without pagination (optional)', () => {
    const request = {
      version: 'v1' as const,
    }

    const result = ListInsightsRequestV1.safeParse(request)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pagination).toBeUndefined()
    }
  })

  it('should fail validation for limit > 100', () => {
    const request = {
      version: 'v1' as const,
      pagination: {
        limit: 150, // Invalid: > 100
        offset: 0,
      },
    }

    const result = ListInsightsRequestV1.safeParse(request)
    expect(result.success).toBe(false)
  })
})

describe('ListInsightsResponseV1', () => {
  it('should validate list response with insights', () => {
    const response = {
      version: 'v1' as const,
      insights: [
        {
          insightId: '123e4567-e89b-12d3-a456-426614174000',
          type: 'person-network' as const,
          status: 'completed' as const,
          createdAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:00:05Z',
        },
        {
          insightId: '223e4567-e89b-12d3-a456-426614174000',
          type: 'risk-assessment' as const,
          status: 'pending' as const,
          createdAt: '2024-01-01T00:01:00Z',
        },
      ],
      pagination: {
        total: 42,
        limit: 20,
        offset: 0,
        hasMore: true,
      },
    }

    const result = ListInsightsResponseV1.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.insights).toHaveLength(2)
      expect(result.data.pagination.total).toBe(42)
      expect(result.data.pagination.hasMore).toBe(true)
    }
  })

  it('should validate empty list response', () => {
    const response = {
      version: 'v1' as const,
      insights: [],
      pagination: {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    }

    const result = ListInsightsResponseV1.safeParse(response)
    expect(result.success).toBe(true)
  })
})
