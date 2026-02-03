import { describe, it, expect } from 'vitest'
import {
  PersonNetworkWorkflowInputV1,
  PersonNetworkWorkflowOutputV1,
  StartPersonNetworkWorkflowRequestV1,
  StartWorkflowResponseV1,
  GetWorkflowStatusResponseV1,
  WorkflowStatusV1,
} from '../src/v1/workflows.js'

describe('PersonNetworkWorkflowInputV1', () => {
  it('should validate valid workflow input', () => {
    const input = {
      version: 'v1' as const,
      personId: '123e4567-e89b-12d3-a456-426614174000',
      analysisDepth: 2,
      includeAnalysis: true,
      options: {
        maxNetworkSize: 100,
        relationshipTypes: ['colleague', 'business'] as const,
      },
    }

    const result = PersonNetworkWorkflowInputV1.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.analysisDepth).toBe(2)
      expect(result.data.includeAnalysis).toBe(true)
    }
  })

  it('should apply default values', () => {
    const input = {
      version: 'v1' as const,
      personId: '123e4567-e89b-12d3-a456-426614174000',
    }

    const result = PersonNetworkWorkflowInputV1.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.analysisDepth).toBe(2) // default
      expect(result.data.includeAnalysis).toBe(true) // default
    }
  })

  it('should fail validation for depth out of range', () => {
    const input = {
      version: 'v1' as const,
      personId: '123e4567-e89b-12d3-a456-426614174000',
      analysisDepth: 5, // Invalid: > 3
    }

    const result = PersonNetworkWorkflowInputV1.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should fail validation for invalid person ID', () => {
    const input = {
      version: 'v1' as const,
      personId: 'not-a-uuid',
      analysisDepth: 2,
    }

    const result = PersonNetworkWorkflowInputV1.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('PersonNetworkWorkflowOutputV1', () => {
  it('should validate valid workflow output', () => {
    const output = {
      version: 'v1' as const,
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
      networkSize: 25,
      summary: 'Alice Smith has a network of 25 connections, primarily colleagues and business associates.',
      associations: [],
      insights: {
        clusterCount: 3,
        strongConnections: 8,
        weakConnections: 5,
        dominantRelationshipType: 'colleague',
      },
      metadata: {
        analyzedAt: '2024-01-01T00:00:00Z',
        processingTimeMs: 1500,
      },
    }

    const result = PersonNetworkWorkflowOutputV1.safeParse(output)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.networkSize).toBe(25)
      expect(result.data.insights?.strongConnections).toBe(8)
    }
  })

  it('should validate output without optional insights', () => {
    const output = {
      version: 'v1' as const,
      person: {
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
          confidence: 1.0,
        },
      },
      networkSize: 10,
      summary: 'Small network.',
      associations: [],
      metadata: {
        analyzedAt: '2024-01-01T00:00:00Z',
        processingTimeMs: 500,
      },
    }

    const result = PersonNetworkWorkflowOutputV1.safeParse(output)
    expect(result.success).toBe(true)
  })
})

describe('StartPersonNetworkWorkflowRequestV1', () => {
  it('should validate valid start workflow request', () => {
    const request = {
      version: 'v1' as const,
      workflow: 'person-network-analysis' as const,
      namespace: 'integration',
      inputs: {
        version: 'v1' as const,
        personId: '123e4567-e89b-12d3-a456-426614174000',
        analysisDepth: 2,
        includeAnalysis: true,
      },
      metadata: {
        correlationId: '223e4567-e89b-12d3-a456-426614174000',
        initiatedBy: 'user@example.com',
        priority: 'high' as const,
      },
    }

    const result = StartPersonNetworkWorkflowRequestV1.safeParse(request)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.workflow).toBe('person-network-analysis')
      expect(result.data.metadata?.priority).toBe('high')
    }
  })

  it('should apply default namespace', () => {
    const request = {
      version: 'v1' as const,
      workflow: 'person-network-analysis' as const,
      inputs: {
        version: 'v1' as const,
        personId: '123e4567-e89b-12d3-a456-426614174000',
      },
    }

    const result = StartPersonNetworkWorkflowRequestV1.safeParse(request)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.namespace).toBe('integration') // default
    }
  })

  it('should fail validation for wrong workflow name', () => {
    const request = {
      version: 'v1' as const,
      workflow: 'wrong-workflow-name',
      inputs: {
        version: 'v1' as const,
        personId: '123e4567-e89b-12d3-a456-426614174000',
      },
    }

    const result = StartPersonNetworkWorkflowRequestV1.safeParse(request)
    expect(result.success).toBe(false)
  })
})

describe('StartWorkflowResponseV1', () => {
  it('should validate valid start workflow response', () => {
    const response = {
      version: 'v1' as const,
      runId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'pending' as const,
      startedAt: '2024-01-01T00:00:00Z',
    }

    const result = StartWorkflowResponseV1.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('pending')
    }
  })

  it('should validate all workflow statuses', () => {
    const statuses: Array<typeof WorkflowStatusV1._type> = [
      'pending',
      'running',
      'completed',
      'failed',
      'cancelled',
      'timeout',
    ]

    statuses.forEach((status) => {
      const response = {
        version: 'v1' as const,
        runId: '123e4567-e89b-12d3-a456-426614174000',
        status,
        startedAt: '2024-01-01T00:00:00Z',
      }

      const result = StartWorkflowResponseV1.safeParse(response)
      expect(result.success).toBe(true)
    })
  })
})

describe('GetWorkflowStatusResponseV1', () => {
  it('should validate completed workflow status', () => {
    const response = {
      version: 'v1' as const,
      runId: '123e4567-e89b-12d3-a456-426614174000',
      workflow: 'person-network-analysis',
      namespace: 'integration',
      status: 'completed' as const,
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:00:05Z',
      outputs: {
        person: { id: '123', type: 'Person', version: 'v1' },
        networkSize: 25,
        summary: 'Network analysis complete',
      },
      steps: [
        {
          id: 'step-1',
          name: 'query-network',
          status: 'completed' as const,
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:00:02Z',
        },
        {
          id: 'step-2',
          name: 'summarize',
          status: 'completed' as const,
          startedAt: '2024-01-01T00:00:02Z',
          completedAt: '2024-01-01T00:00:05Z',
        },
      ],
      metadata: {
        totalSteps: 2,
        completedSteps: 2,
        processingTimeMs: 5000,
      },
    }

    const result = GetWorkflowStatusResponseV1.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('completed')
      expect(result.data.steps).toHaveLength(2)
      expect(result.data.metadata?.completedSteps).toBe(2)
    }
  })

  it('should validate failed workflow status with error', () => {
    const response = {
      version: 'v1' as const,
      runId: '123e4567-e89b-12d3-a456-426614174000',
      workflow: 'person-network-analysis',
      namespace: 'integration',
      status: 'failed' as const,
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:00:03Z',
      error: 'IntelGraph query failed: person not found',
      steps: [
        {
          id: 'step-1',
          name: 'query-network',
          status: 'failed' as const,
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:00:03Z',
          error: 'Person not found',
        },
      ],
    }

    const result = GetWorkflowStatusResponseV1.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('failed')
      expect(result.data.error).toBeDefined()
      expect(result.data.steps?.[0].status).toBe('failed')
    }
  })

  it('should validate running workflow without outputs', () => {
    const response = {
      version: 'v1' as const,
      runId: '123e4567-e89b-12d3-a456-426614174000',
      workflow: 'person-network-analysis',
      namespace: 'integration',
      status: 'running' as const,
      startedAt: '2024-01-01T00:00:00Z',
      steps: [
        {
          id: 'step-1',
          name: 'query-network',
          status: 'running' as const,
          startedAt: '2024-01-01T00:00:00Z',
        },
      ],
    }

    const result = GetWorkflowStatusResponseV1.safeParse(response)
    expect(result.success).toBe(true)
  })
})
