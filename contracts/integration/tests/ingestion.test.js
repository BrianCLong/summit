"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ingestion_js_1 = require("../src/v1/ingestion.js");
(0, vitest_1.describe)('IngestPersonRequestV1', () => {
    (0, vitest_1.it)('should validate a valid person ingestion request', () => {
        const request = {
            version: 'v1',
            correlationId: '123e4567-e89b-12d3-a456-426614174000',
            source: {
                id: 'csv-import-001',
                name: 'CSV Import',
                type: 'csv',
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
                        type: 'Person',
                        version: 'v1',
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
                        type: 'ASSOCIATED_WITH',
                        version: 'v1',
                        from: '223e4567-e89b-12d3-a456-426614174000',
                        to: '423e4567-e89b-12d3-a456-426614174000',
                        attributes: {
                            relationshipType: 'colleague',
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
        };
        const result = ingestion_js_1.IngestPersonRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.payload.persons).toHaveLength(1);
            (0, vitest_1.expect)(result.data.payload.associations).toHaveLength(1);
            (0, vitest_1.expect)(result.data.source.type).toBe('csv');
        }
    });
    (0, vitest_1.it)('should validate request without optional associations', () => {
        const request = {
            version: 'v1',
            correlationId: '123e4567-e89b-12d3-a456-426614174000',
            source: {
                id: 'test-source',
                name: 'Test Source',
                type: 'manual',
            },
            provenance: {
                ingestedAt: '2024-01-01T00:00:00Z',
                confidence: 1.0,
            },
            payload: {
                persons: [
                    {
                        id: '223e4567-e89b-12d3-a456-426614174000',
                        type: 'Person',
                        version: 'v1',
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
        };
        const result = ingestion_js_1.IngestPersonRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('should fail validation for invalid correlation ID', () => {
        const request = {
            version: 'v1',
            correlationId: 'not-a-uuid',
            source: {
                id: 'test-source',
                name: 'Test Source',
                type: 'manual',
            },
            provenance: {
                ingestedAt: '2024-01-01T00:00:00Z',
                confidence: 1.0,
            },
            payload: {
                persons: [],
            },
        };
        const result = ingestion_js_1.IngestPersonRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('should fail validation for invalid source type', () => {
        const request = {
            version: 'v1',
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
        };
        const result = ingestion_js_1.IngestPersonRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('IngestPersonResponseV1', () => {
    (0, vitest_1.it)('should validate a successful ingestion response', () => {
        const response = {
            version: 'v1',
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
        };
        const result = ingestion_js_1.IngestPersonResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.result.success).toBe(true);
            (0, vitest_1.expect)(result.data.result.personsCreated).toBe(5);
            (0, vitest_1.expect)(result.data.metadata?.processingTimeMs).toBe(250);
        }
    });
    (0, vitest_1.it)('should validate a failed ingestion response with errors', () => {
        const response = {
            version: 'v1',
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
                        code: 'VALIDATION_ERROR',
                    },
                    {
                        error: 'Database connection failed',
                        code: 'INTERNAL_ERROR',
                    },
                ],
            },
        };
        const result = ingestion_js_1.IngestPersonResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.result.success).toBe(false);
            (0, vitest_1.expect)(result.data.result.errors).toHaveLength(2);
            (0, vitest_1.expect)(result.data.result.errors?.[0].code).toBe('VALIDATION_ERROR');
        }
    });
    (0, vitest_1.it)('should validate response without optional metadata', () => {
        const response = {
            version: 'v1',
            correlationId: '123e4567-e89b-12d3-a456-426614174000',
            result: {
                success: true,
                personsCreated: 1,
                personsUpdated: 0,
                associationsCreated: 0,
            },
        };
        const result = ingestion_js_1.IngestPersonResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
(0, vitest_1.describe)('IngestErrorV1', () => {
    (0, vitest_1.it)('should validate all error codes', () => {
        const errorCodes = [
            'VALIDATION_ERROR',
            'DUPLICATE_ENTITY',
            'MISSING_DEPENDENCY',
            'CONSTRAINT_VIOLATION',
            'INTERNAL_ERROR',
        ];
        errorCodes.forEach((code) => {
            const error = {
                error: `Test error for ${code}`,
                code,
            };
            const result = ingestion_js_1.IngestErrorV1.safeParse(error);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data.code).toBe(code);
            }
        });
    });
    (0, vitest_1.it)('should allow optional entityId and field', () => {
        const error = {
            error: 'General error',
            code: 'INTERNAL_ERROR',
        };
        const result = ingestion_js_1.IngestErrorV1.safeParse(error);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('should fail validation for invalid error code', () => {
        const error = {
            error: 'Test error',
            code: 'INVALID_CODE',
        };
        const result = ingestion_js_1.IngestErrorV1.safeParse(error);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
