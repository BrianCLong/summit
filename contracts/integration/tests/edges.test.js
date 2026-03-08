"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const edges_js_1 = require("../src/v1/edges.js");
(0, vitest_1.describe)('AssociatedWithEdgeV1', () => {
    (0, vitest_1.it)('should validate a valid ASSOCIATED_WITH edge', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'ASSOCIATED_WITH',
            version: 'v1',
            from: '223e4567-e89b-12d3-a456-426614174000',
            to: '323e4567-e89b-12d3-a456-426614174000',
            attributes: {
                relationshipType: 'colleague',
                strength: 0.8,
                description: 'Work colleagues at Acme Corp',
                startDate: '2020-01-01',
            },
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                source: 'test-source',
                confidence: 0.95,
            },
        };
        const result = edges_js_1.AssociatedWithEdgeV1.safeParse(edge);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.attributes.relationshipType).toBe('colleague');
            (0, vitest_1.expect)(result.data.attributes.strength).toBe(0.8);
        }
    });
    (0, vitest_1.it)('should apply default values for optional fields', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'ASSOCIATED_WITH',
            version: 'v1',
            from: '223e4567-e89b-12d3-a456-426614174000',
            to: '323e4567-e89b-12d3-a456-426614174000',
            attributes: {},
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                source: 'test-source',
                confidence: 0.95,
            },
        };
        const result = edges_js_1.AssociatedWithEdgeV1.safeParse(edge);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.attributes.relationshipType).toBe('unknown'); // default
            (0, vitest_1.expect)(result.data.attributes.strength).toBe(0.5); // default
        }
    });
    (0, vitest_1.it)('should fail validation for strength out of range', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'ASSOCIATED_WITH',
            version: 'v1',
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
        };
        const result = edges_js_1.AssociatedWithEdgeV1.safeParse(edge);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('should fail validation for invalid relationship type', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'ASSOCIATED_WITH',
            version: 'v1',
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
        };
        const result = edges_js_1.AssociatedWithEdgeV1.safeParse(edge);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('WorksForEdgeV1', () => {
    (0, vitest_1.it)('should validate a valid WORKS_FOR edge', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'WORKS_FOR',
            version: 'v1',
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
        };
        const result = edges_js_1.WorksForEdgeV1.safeParse(edge);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.attributes.title).toBe('Software Engineer');
            (0, vitest_1.expect)(result.data.attributes.isCurrent).toBe(true);
        }
    });
    (0, vitest_1.it)('should apply default value for isCurrent', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'WORKS_FOR',
            version: 'v1',
            from: '223e4567-e89b-12d3-a456-426614174000',
            to: '323e4567-e89b-12d3-a456-426614174000',
            attributes: {},
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                source: 'test-source',
                confidence: 0.95,
            },
        };
        const result = edges_js_1.WorksForEdgeV1.safeParse(edge);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.attributes.isCurrent).toBe(true); // default
        }
    });
});
(0, vitest_1.describe)('OwnsEdgeV1', () => {
    (0, vitest_1.it)('should validate a valid OWNS edge', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'OWNS',
            version: 'v1',
            from: '223e4567-e89b-12d3-a456-426614174000',
            to: '323e4567-e89b-12d3-a456-426614174000',
            attributes: {
                ownershipPercentage: 51,
                ownershipType: 'majority',
                startDate: '2020-01-01',
            },
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                source: 'test-source',
                confidence: 0.95,
            },
        };
        const result = edges_js_1.OwnsEdgeV1.safeParse(edge);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.attributes.ownershipPercentage).toBe(51);
            (0, vitest_1.expect)(result.data.attributes.ownershipType).toBe('majority');
        }
    });
    (0, vitest_1.it)('should fail validation for ownership percentage > 100', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'OWNS',
            version: 'v1',
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
        };
        const result = edges_js_1.OwnsEdgeV1.safeParse(edge);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('Edge type guards', () => {
    (0, vitest_1.it)('should correctly identify ASSOCIATED_WITH edges', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'ASSOCIATED_WITH',
            version: 'v1',
            from: '223e4567-e89b-12d3-a456-426614174000',
            to: '323e4567-e89b-12d3-a456-426614174000',
            attributes: {},
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                source: 'test',
                confidence: 1.0,
            },
        };
        (0, vitest_1.expect)((0, edges_js_1.isAssociatedWith)(edge)).toBe(true);
        (0, vitest_1.expect)((0, edges_js_1.isWorksFor)(edge)).toBe(false);
        (0, vitest_1.expect)((0, edges_js_1.isOwns)(edge)).toBe(false);
    });
    (0, vitest_1.it)('should correctly identify WORKS_FOR edges', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'WORKS_FOR',
            version: 'v1',
            from: '223e4567-e89b-12d3-a456-426614174000',
            to: '323e4567-e89b-12d3-a456-426614174000',
            attributes: {},
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                source: 'test',
                confidence: 1.0,
            },
        };
        (0, vitest_1.expect)((0, edges_js_1.isWorksFor)(edge)).toBe(true);
        (0, vitest_1.expect)((0, edges_js_1.isAssociatedWith)(edge)).toBe(false);
        (0, vitest_1.expect)((0, edges_js_1.isOwns)(edge)).toBe(false);
    });
    (0, vitest_1.it)('should correctly identify OWNS edges', () => {
        const edge = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'OWNS',
            version: 'v1',
            from: '223e4567-e89b-12d3-a456-426614174000',
            to: '323e4567-e89b-12d3-a456-426614174000',
            attributes: {},
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                source: 'test',
                confidence: 1.0,
            },
        };
        (0, vitest_1.expect)((0, edges_js_1.isOwns)(edge)).toBe(true);
        (0, vitest_1.expect)((0, edges_js_1.isAssociatedWith)(edge)).toBe(false);
        (0, vitest_1.expect)((0, edges_js_1.isWorksFor)(edge)).toBe(false);
    });
});
