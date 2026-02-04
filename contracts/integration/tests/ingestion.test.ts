import { describe, it, expect } from 'vitest'
import { IngestPersonRequestV1, IngestPersonResponseV1, IngestErrorV1 } from '../src/v1/ingestion.js'

describe('IngestPersonRequestV1', () => {
  it('should validate a valid person ingestion request', () => {
    const request = {
      version: 'v1' as const,
      correlationId: '123e4567-e89b-12d3-a456-426614174000',
      source: {
        id: 'csv-import-001',
        name: 'CSV Import',
        type: 'csv' as const,
        version: '1.0',
      },
      provenance: {
        ingestedAt: '2024-01-01T00:00:00Z',
        ingestedBy: 'user@example.com',
        confidence: 0.9,
        correlationId: '123e4567-e89b-12d3-a456-426614174000',
        batchId: 'batch-001',
      },
      payload: {
        persons: [
          {
            id: '223e4567-e89b-12d3-a456-426614174000',
            type: 'Person' as const,
            version: 'v1' as const,
            attributes: {
              name: 'Alice Smith',
              email: 'alice@example.com',
            },
            metadata: {
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              source: 'csv-import-001',
              confidence: 0.9,
            },
          },
        ],
        associations: [
          {
            id: '323e4567-e89b-12d3-a456-426614174000',
            type: 'ASSOCIATED_WITH' as const,
            version: 'v1' as const,
            from: '223e4567-e89b-12d3-a456-426614174000',
            to: '423e4567-e89b-12d3-a456-426614174000',
            attributes: {
              relationshipType: 'colleague' as const,
              strength: 0.8,
            },
            metadata: {
              createdAt: '2024-01-01T00:00:00Z',
              source: 'csv-import-001',
              confidence: 0.8,
            },
          },
        ],
      },
    }

    const result = IngestPersonRequestV1.safeParse(request)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.payload.persons).toHaveLength(1)
      expect(result.data.payload.associations).toHaveLength(1)
      expect(result.data.source.type).toBe('csv')
    }
  })

  it('should validate request without optional associations', () => {
    const request = {
      version: 'v1' as const,
      correlationId: '123e4567-e89b-12d3-a456-426614174000',
      source: {
        id: 'test-source',
        name: 'Test Source',
        type: 'manual' as const,
      },
      provenance: {
        ingestedAt: '2024-01-01T00:00:00Z',
        confidence: 1.0,
      },
      payload: {
        persons: [
          {
            id: '223e4567-e89b-12d3-a456-426614174000',
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
        ],
      },
    }

    const result = IngestPersonRequestV1.safeParse(request)
    expect(result.success).toBe(true)
  })

  it('should fail validation for invalid correlation ID', () => {
    const request = {
      version: 'v1' as const,
      correlationId: 'not-a-uuid',
      source: {
        id: 'test-source',
        name: 'Test Source',
        type: 'manual' as const,
      },
      provenance: {
        ingestedAt: '2024-01-01T00:00:00Z',
        confidence: 1.0,
      },
      payload: {
        persons: [],
      },
    }

    const result = IngestPersonRequestV1.safeParse(request)
    expect(result.success).toBe(false)
  })

  it('should fail validation for invalid source type', () => {
    const request = {
      version: 'v1' as const,
      correlationId: '123e4567-e89b-12d3-a456-426614174000',
      source: {
        id: 'test-source',
        name: 'Test Source',
        type: 'invalid-type',
      },
      provenance: {
        ingestedAt: '2024-01-01T00:00:00Z',
        confidence: 1.0,
      },
      payload: {
        persons: [],
      },
    }

    const result = IngestPersonRequestV1.safeParse(request)
    expect(result.success).toBe(false)
  })
})

describe('IngestPersonResponseV1', () => {
  it('should validate a successful ingestion response', () => {
    const response = {
      version: 'v1' as const,
      correlationId: '123e4567-e89b-12d3-a456-426614174000',
      result: {
        success: true,
        personsCreated: 5,
        personsUpdated: 2,
        associationsCreated: 8,
        employmentsCreated: 3,
      },
      metadata: {
        processingTimeMs: 250,
        idempotencyKey: 'batch-001-hash-abc123',
      },
    }

    const result = IngestPersonResponseV1.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.result.success).toBe(true)
      expect(result.data.result.personsCreated).toBe(5)
      expect(result.data.metadata?.processingTimeMs).toBe(250)
    }
  })

  it('should validate a failed ingestion response with errors', () => {
    const response = {
      version: 'v1' as const,
      correlationId: '123e4567-e89b-12d3-a456-426614174000',
      result: {
        success: false,
        personsCreated: 0,
        personsUpdated: 0,
        associationsCreated: 0,
        errors: [
          {
            entityId: '223e4567-e89b-12d3-a456-426614174000',
            field: 'attributes.email',
            error: 'Invalid email format',
            code: 'VALIDATION_ERROR' as const,
          },
          {
            error: 'Database connection failed',
            code: 'INTERNAL_ERROR' as const,
          },
        ],
      },
    }

    const result = IngestPersonResponseV1.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.result.success).toBe(false)
      expect(result.data.result.errors).toHaveLength(2)
      expect(result.data.result.errors?.[0].code).toBe('VALIDATION_ERROR')
    }
  })

  it('should validate response without optional metadata', () => {
    const response = {
      version: 'v1' as const,
      correlationId: '123e4567-e89b-12d3-a456-426614174000',
      result: {
        success: true,
        personsCreated: 1,
        personsUpdated: 0,
        associationsCreated: 0,
      },
    }

    const result = IngestPersonResponseV1.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('IngestErrorV1', () => {
  it('should validate all error codes', () => {
    const errorCodes = [
      'VALIDATION_ERROR',
      'DUPLICATE_ENTITY',
      'MISSING_DEPENDENCY',
      'CONSTRAINT_VIOLATION',
      'INTERNAL_ERROR',
    ] as const

    errorCodes.forEach((code) => {
      const error = {
        error: `Test error for ${code}`,
        code,
      }

      const result = IngestErrorV1.safeParse(error)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe(code)
      }
    })
  })

  it('should allow optional entityId and field', () => {
    const error = {
      error: 'General error',
      code: 'INTERNAL_ERROR' as const,
    }

    const result = IngestErrorV1.safeParse(error)
    expect(result.success).toBe(true)
  })

  it('should fail validation for invalid error code', () => {
    const error = {
      error: 'Test error',
      code: 'INVALID_CODE',
    }

    const result = IngestErrorV1.safeParse(error)
    expect(result.success).toBe(false)
  })
})
