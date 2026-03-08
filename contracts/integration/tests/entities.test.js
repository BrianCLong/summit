"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const entities_js_1 = require("../src/v1/entities.js");
(0, vitest_1.describe)('PersonEntityV1', () => {
    (0, vitest_1.it)('should validate a valid person entity', () => {
        const person = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'Person',
            version: 'v1',
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
        };
        const result = entities_js_1.PersonEntityV1.safeParse(person);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.attributes.name).toBe('Alice Smith');
            (0, vitest_1.expect)(result.data.metadata.confidence).toBe(0.95);
        }
    });
    (0, vitest_1.it)('should fail validation for invalid email', () => {
        const person = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'Person',
            version: 'v1',
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
        };
        const result = entities_js_1.PersonEntityV1.safeParse(person);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('should fail validation for confidence out of range', () => {
        const person = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'Person',
            version: 'v1',
            attributes: {
                name: 'Alice Smith',
            },
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                source: 'test-source',
                confidence: 1.5, // Invalid: > 1.0
            },
        };
        const result = entities_js_1.PersonEntityV1.safeParse(person);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('should allow optional fields to be omitted', () => {
        const person = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'Person',
            version: 'v1',
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
        };
        const result = entities_js_1.PersonEntityV1.safeParse(person);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
(0, vitest_1.describe)('OrganizationEntityV1', () => {
    (0, vitest_1.it)('should validate a valid organization entity', () => {
        const org = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'Organization',
            version: 'v1',
            attributes: {
                name: 'Acme Corp',
                legalName: 'Acme Corporation Inc.',
                website: 'https://acme.com',
                domain: 'acme.com',
                industry: 'Technology',
                size: '51-200',
                location: 'San Francisco, CA',
            },
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                source: 'test-source',
                confidence: 0.95,
            },
        };
        const result = entities_js_1.OrganizationEntityV1.safeParse(org);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.attributes.name).toBe('Acme Corp');
            (0, vitest_1.expect)(result.data.attributes.size).toBe('51-200');
        }
    });
    (0, vitest_1.it)('should fail validation for invalid website URL', () => {
        const org = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'Organization',
            version: 'v1',
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
        };
        const result = entities_js_1.OrganizationEntityV1.safeParse(org);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('should fail validation for invalid size enum', () => {
        const org = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'Organization',
            version: 'v1',
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
        };
        const result = entities_js_1.OrganizationEntityV1.safeParse(org);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('Entity type guards', () => {
    (0, vitest_1.it)('should correctly identify Person entities', () => {
        const person = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'Person',
            version: 'v1',
            attributes: { name: 'Alice' },
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                source: 'test',
                confidence: 1.0,
            },
        };
        (0, vitest_1.expect)((0, entities_js_1.isPerson)(person)).toBe(true);
        (0, vitest_1.expect)((0, entities_js_1.isOrganization)(person)).toBe(false);
    });
    (0, vitest_1.it)('should correctly identify Organization entities', () => {
        const org = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'Organization',
            version: 'v1',
            attributes: { name: 'Acme Corp' },
            metadata: {
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                source: 'test',
                confidence: 1.0,
            },
        };
        (0, vitest_1.expect)((0, entities_js_1.isOrganization)(org)).toBe(true);
        (0, vitest_1.expect)((0, entities_js_1.isPerson)(org)).toBe(false);
    });
});
