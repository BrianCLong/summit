"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const insights_js_1 = require("../src/v1/insights.js");
(0, vitest_1.describe)('CreatePersonNetworkInsightRequestV1', () => {
    (0, vitest_1.it)('should validate valid insight creation request', () => {
        const request = {
            version: 'v1',
            personId: '123e4567-e89b-12d3-a456-426614174000',
            depth: 2,
            options: {
                includeAnalysis: true,
                maxNetworkSize: 100,
                relationshipTypes: ['colleague', 'business'],
            },
            metadata: {
                requestedBy: 'user@example.com',
                correlationId: '223e4567-e89b-12d3-a456-426614174000',
            },
        };
        const result = insights_js_1.CreatePersonNetworkInsightRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.depth).toBe(2);
            (0, vitest_1.expect)(result.data.options?.includeAnalysis).toBe(true);
        }
    });
    (0, vitest_1.it)('should apply default depth', () => {
        const request = {
            version: 'v1',
            personId: '123e4567-e89b-12d3-a456-426614174000',
        };
        const result = insights_js_1.CreatePersonNetworkInsightRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.depth).toBe(2); // default
        }
    });
    (0, vitest_1.it)('should fail validation for depth out of range', () => {
        const request = {
            version: 'v1',
            personId: '123e4567-e89b-12d3-a456-426614174000',
            depth: 5, // Invalid: > 3
        };
        const result = insights_js_1.CreatePersonNetworkInsightRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('should fail validation for invalid person ID', () => {
        const request = {
            version: 'v1',
            personId: 'not-a-uuid',
            depth: 2,
        };
        const result = insights_js_1.CreatePersonNetworkInsightRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('CreatePersonNetworkInsightResponseV1', () => {
    (0, vitest_1.it)('should validate completed insight response with data', () => {
        const response = {
            version: 'v1',
            insightId: '323e4567-e89b-12d3-a456-426614174000',
            type: 'person-network',
            status: 'completed',
            data: {
                person: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    type: 'Person',
                    version: 'v1',
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
        };
        const result = insights_js_1.CreatePersonNetworkInsightResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.status).toBe('completed');
            (0, vitest_1.expect)(result.data.data?.network.size).toBe(25);
            (0, vitest_1.expect)(result.data.data?.network.clusters).toHaveLength(2);
            (0, vitest_1.expect)(result.data.data?.insights?.keyConnectors).toHaveLength(1);
        }
    });
    (0, vitest_1.it)('should validate pending insight response without data', () => {
        const response = {
            version: 'v1',
            insightId: '323e4567-e89b-12d3-a456-426614174000',
            type: 'person-network',
            status: 'pending',
            metadata: {
                generatedAt: '2024-01-01T00:00:00Z',
                maestroRunId: '523e4567-e89b-12d3-a456-426614174000',
            },
        };
        const result = insights_js_1.CreatePersonNetworkInsightResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.status).toBe('pending');
            (0, vitest_1.expect)(result.data.data).toBeUndefined();
        }
    });
    (0, vitest_1.it)('should validate failed insight response with error', () => {
        const response = {
            version: 'v1',
            insightId: '323e4567-e89b-12d3-a456-426614174000',
            type: 'person-network',
            status: 'failed',
            error: 'Workflow execution failed: person not found',
            metadata: {
                generatedAt: '2024-01-01T00:00:00Z',
                maestroRunId: '523e4567-e89b-12d3-a456-426614174000',
                processingTimeMs: 1000,
            },
        };
        const result = insights_js_1.CreatePersonNetworkInsightResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.status).toBe('failed');
            (0, vitest_1.expect)(result.data.error).toBeDefined();
        }
    });
    (0, vitest_1.it)('should validate all insight statuses', () => {
        const statuses = ['pending', 'generating', 'completed', 'failed'];
        statuses.forEach((status) => {
            const response = {
                version: 'v1',
                insightId: '323e4567-e89b-12d3-a456-426614174000',
                type: 'person-network',
                status,
                metadata: {
                    generatedAt: '2024-01-01T00:00:00Z',
                    maestroRunId: '523e4567-e89b-12d3-a456-426614174000',
                },
            };
            const result = insights_js_1.CreatePersonNetworkInsightResponseV1.safeParse(response);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
});
(0, vitest_1.describe)('GetInsightResponseV1', () => {
    (0, vitest_1.it)('should validate generic insight response', () => {
        const response = {
            version: 'v1',
            insightId: '323e4567-e89b-12d3-a456-426614174000',
            type: 'person-network',
            status: 'completed',
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
        };
        const result = insights_js_1.GetInsightResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('should validate all insight types', () => {
        const types = [
            'person-network',
            'organization-network',
            'relationship-analysis',
            'risk-assessment',
            'entity-summary',
        ];
        types.forEach((type) => {
            const response = {
                version: 'v1',
                insightId: '323e4567-e89b-12d3-a456-426614174000',
                type,
                status: 'completed',
                metadata: {
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
            };
            const result = insights_js_1.GetInsightResponseV1.safeParse(response);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
});
(0, vitest_1.describe)('ListInsightsRequestV1', () => {
    (0, vitest_1.it)('should validate list request with filters', () => {
        const request = {
            version: 'v1',
            filters: {
                type: 'person-network',
                status: 'completed',
                requestedBy: 'user@example.com',
                createdAfter: '2024-01-01T00:00:00Z',
                createdBefore: '2024-12-31T23:59:59Z',
            },
            pagination: {
                limit: 50,
                offset: 0,
            },
        };
        const result = insights_js_1.ListInsightsRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.filters?.type).toBe('person-network');
            (0, vitest_1.expect)(result.data.pagination?.limit).toBe(50);
        }
    });
    (0, vitest_1.it)('should apply default pagination values when pagination object is provided', () => {
        const request = {
            version: 'v1',
            pagination: {},
        };
        const result = insights_js_1.ListInsightsRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.pagination?.limit).toBe(20); // default
            (0, vitest_1.expect)(result.data.pagination?.offset).toBe(0); // default
        }
    });
    (0, vitest_1.it)('should validate request without pagination (optional)', () => {
        const request = {
            version: 'v1',
        };
        const result = insights_js_1.ListInsightsRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.pagination).toBeUndefined();
        }
    });
    (0, vitest_1.it)('should fail validation for limit > 100', () => {
        const request = {
            version: 'v1',
            pagination: {
                limit: 150, // Invalid: > 100
                offset: 0,
            },
        };
        const result = insights_js_1.ListInsightsRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('ListInsightsResponseV1', () => {
    (0, vitest_1.it)('should validate list response with insights', () => {
        const response = {
            version: 'v1',
            insights: [
                {
                    insightId: '123e4567-e89b-12d3-a456-426614174000',
                    type: 'person-network',
                    status: 'completed',
                    createdAt: '2024-01-01T00:00:00Z',
                    completedAt: '2024-01-01T00:00:05Z',
                },
                {
                    insightId: '223e4567-e89b-12d3-a456-426614174000',
                    type: 'risk-assessment',
                    status: 'pending',
                    createdAt: '2024-01-01T00:01:00Z',
                },
            ],
            pagination: {
                total: 42,
                limit: 20,
                offset: 0,
                hasMore: true,
            },
        };
        const result = insights_js_1.ListInsightsResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.insights).toHaveLength(2);
            (0, vitest_1.expect)(result.data.pagination.total).toBe(42);
            (0, vitest_1.expect)(result.data.pagination.hasMore).toBe(true);
        }
    });
    (0, vitest_1.it)('should validate empty list response', () => {
        const response = {
            version: 'v1',
            insights: [],
            pagination: {
                total: 0,
                limit: 20,
                offset: 0,
                hasMore: false,
            },
        };
        const result = insights_js_1.ListInsightsResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
