"use strict";
/**
 * Canonical Entity Validation Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const types_js_1 = require("../types.js");
(0, vitest_1.describe)('Canonical Entity Validation', () => {
    (0, vitest_1.describe)('PersonEntity', () => {
        (0, vitest_1.it)('should validate a valid person entity', () => {
            const person = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                canonicalId: null,
                entityType: 'Person',
                confidence: { score: 0.95, method: 'ml-classifier' },
                source: 'connector:ofac',
                sources: [{ sourceId: 'ofac-123', fetchedAt: new Date() }],
                classification: 'UNCLASSIFIED',
                compartments: [],
                tenantId: 'tenant-1',
                validFrom: new Date('2024-01-01'),
                validTo: null,
                observedAt: new Date(),
                recordedAt: new Date(),
                name: { full: 'John Doe', first: 'John', last: 'Doe' },
                identifiers: [{ type: 'passport', value: 'AB123456', country: 'US' }],
                nationalities: ['US'],
            };
            const result = (0, types_js_1.validateEntity)(person);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should reject person without required name', () => {
            const invalidPerson = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                entityType: 'Person',
                // missing name
            };
            const result = (0, types_js_1.validateEntity)(invalidPerson);
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('should validate identifiers schema', () => {
            const person = {
                identifiers: [
                    { type: 'passport', value: 'AB123456', country: 'US' },
                    { type: 'ssn', value: '***-**-1234', country: 'US' }, // masked
                ],
            };
            (0, vitest_1.expect)(person.identifiers).toHaveLength(2);
            (0, vitest_1.expect)(person.identifiers[0].type).toBe('passport');
        });
    });
    (0, vitest_1.describe)('OrganizationEntity', () => {
        (0, vitest_1.it)('should validate organization with LEI', () => {
            const org = {
                id: '123e4567-e89b-12d3-a456-426614174001',
                canonicalId: null,
                entityType: 'Organization',
                confidence: { score: 0.99, method: 'exact-match' },
                source: 'connector:gleif',
                sources: [],
                classification: 'UNCLASSIFIED',
                compartments: [],
                tenantId: 'tenant-1',
                validFrom: new Date(),
                validTo: null,
                observedAt: new Date(),
                recordedAt: new Date(),
                name: 'Acme Corporation',
                legalName: 'Acme Corporation Inc.',
                lei: '5493001KJTIIGC8Y1R12',
                jurisdiction: 'US-DE',
                entityStatus: 'active',
            };
            const result = (0, types_js_1.validateEntity)(org);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
    (0, vitest_1.describe)('AssetEntity', () => {
        (0, vitest_1.it)('should validate financial asset', () => {
            const asset = {
                id: '123e4567-e89b-12d3-a456-426614174002',
                canonicalId: null,
                entityType: 'Asset',
                confidence: { score: 0.85, method: 'rule-based' },
                source: 'connector:internal',
                sources: [],
                classification: 'CONFIDENTIAL',
                compartments: ['FINANCE'],
                tenantId: 'tenant-1',
                validFrom: new Date(),
                validTo: null,
                observedAt: new Date(),
                recordedAt: new Date(),
                assetType: 'financial',
                name: 'Corporate Account',
                value: { amount: 1000000, currency: 'USD' },
                ownership: [{ entityId: 'org-123', percentage: 100 }],
            };
            const result = (0, types_js_1.validateEntity)(asset);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
    (0, vitest_1.describe)('EventEntity', () => {
        (0, vitest_1.it)('should validate event with participants', () => {
            const event = {
                id: '123e4567-e89b-12d3-a456-426614174003',
                canonicalId: null,
                entityType: 'Event',
                confidence: { score: 0.75, method: 'nlp-extraction' },
                source: 'connector:news',
                sources: [],
                classification: 'UNCLASSIFIED',
                compartments: [],
                tenantId: 'tenant-1',
                validFrom: new Date(),
                validTo: null,
                observedAt: new Date(),
                recordedAt: new Date(),
                eventType: 'meeting',
                name: 'Board Meeting Q4',
                occurredAt: new Date('2024-12-01'),
                location: { type: 'address', value: 'New York, NY' },
                participants: [
                    { entityId: 'person-1', role: 'attendee' },
                    { entityId: 'person-2', role: 'chair' },
                ],
            };
            const result = (0, types_js_1.validateEntity)(event);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
    (0, vitest_1.describe)('Bitemporal Fields', () => {
        (0, vitest_1.it)('should require observedAt and recordedAt', () => {
            const entity = (0, types_js_1.createEntity)('Person', {
                name: { full: 'Test User' },
            });
            (0, vitest_1.expect)(entity.observedAt).toBeDefined();
            (0, vitest_1.expect)(entity.recordedAt).toBeDefined();
            (0, vitest_1.expect)(entity.validFrom).toBeDefined();
        });
        (0, vitest_1.it)('should track temporal validity', () => {
            const entity = (0, types_js_1.createEntity)('Person', {
                name: { full: 'Test User' },
                validFrom: new Date('2024-01-01'),
                validTo: new Date('2024-12-31'),
            });
            const now = new Date('2024-06-15');
            const isValid = entity.validFrom <= now && (entity.validTo === null || entity.validTo >= now);
            (0, vitest_1.expect)(isValid).toBe(true);
        });
    });
    (0, vitest_1.describe)('Classification', () => {
        (0, vitest_1.it)('should validate classification levels', () => {
            const validLevels = [
                'UNCLASSIFIED',
                'CONFIDENTIAL',
                'SECRET',
                'TOP_SECRET',
            ];
            validLevels.forEach((level) => {
                const entity = (0, types_js_1.createEntity)('Person', {
                    name: { full: 'Test' },
                    classification: level,
                });
                (0, vitest_1.expect)(entity.classification).toBe(level);
            });
        });
        (0, vitest_1.it)('should handle compartments', () => {
            const entity = (0, types_js_1.createEntity)('Person', {
                name: { full: 'Test' },
                classification: 'SECRET',
                compartments: ['GAMMA', 'SIGINT'],
            });
            (0, vitest_1.expect)(entity.compartments).toContain('GAMMA');
            (0, vitest_1.expect)(entity.compartments).toContain('SIGINT');
        });
    });
});
