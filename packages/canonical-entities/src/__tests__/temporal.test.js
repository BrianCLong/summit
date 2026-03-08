"use strict";
/**
 * Tests for temporal/bitemporal query helpers
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const temporal_js_1 = require("../temporal.js");
(0, vitest_1.describe)('Temporal Helpers', () => {
    (0, vitest_1.describe)('isValidAt', () => {
        (0, vitest_1.it)('should return true for entity valid at specified time', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2021-01-01'),
            };
            (0, vitest_1.expect)((0, temporal_js_1.isValidAt)(entity, new Date('2020-06-01'))).toBe(true);
        });
        (0, vitest_1.it)('should return false for entity not yet valid', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2021-01-01'),
            };
            (0, vitest_1.expect)((0, temporal_js_1.isValidAt)(entity, new Date('2019-01-01'))).toBe(false);
        });
        (0, vitest_1.it)('should return false for expired entity', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2021-01-01'),
            };
            (0, vitest_1.expect)((0, temporal_js_1.isValidAt)(entity, new Date('2022-01-01'))).toBe(false);
        });
        (0, vitest_1.it)('should handle null validFrom (valid from beginning of time)', () => {
            const entity = {
                validFrom: null,
                validTo: new Date('2021-01-01'),
            };
            (0, vitest_1.expect)((0, temporal_js_1.isValidAt)(entity, new Date('1900-01-01'))).toBe(true);
            (0, vitest_1.expect)((0, temporal_js_1.isValidAt)(entity, new Date('2022-01-01'))).toBe(false);
        });
        (0, vitest_1.it)('should handle null validTo (still valid)', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: null,
            };
            (0, vitest_1.expect)((0, temporal_js_1.isValidAt)(entity, new Date('2025-01-01'))).toBe(true);
        });
        (0, vitest_1.it)('should accept ISO string dates', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2021-01-01'),
            };
            (0, vitest_1.expect)((0, temporal_js_1.isValidAt)(entity, '2020-06-01')).toBe(true);
        });
    });
    (0, vitest_1.describe)('validityOverlaps', () => {
        (0, vitest_1.it)('should return true for overlapping validity windows', () => {
            const a = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2020-12-31'),
            };
            const b = {
                validFrom: new Date('2020-06-01'),
                validTo: new Date('2021-06-01'),
            };
            (0, vitest_1.expect)((0, temporal_js_1.validityOverlaps)(a, b)).toBe(true);
        });
        (0, vitest_1.it)('should return false for non-overlapping windows', () => {
            const a = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2020-12-31'),
            };
            const b = {
                validFrom: new Date('2021-01-01'),
                validTo: new Date('2021-12-31'),
            };
            (0, vitest_1.expect)((0, temporal_js_1.validityOverlaps)(a, b)).toBe(false);
        });
        (0, vitest_1.it)('should handle null bounds', () => {
            const a = {
                validFrom: new Date('2020-01-01'),
                validTo: null,
            };
            const b = {
                validFrom: null,
                validTo: new Date('2021-01-01'),
            };
            (0, vitest_1.expect)((0, temporal_js_1.validityOverlaps)(a, b)).toBe(true);
        });
    });
    (0, vitest_1.describe)('isBitemporallyValid', () => {
        (0, vitest_1.it)('should validate both valid time and transaction time', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2021-01-01'),
                recordedAt: new Date('2020-06-01'),
            };
            // Entity was valid in 2020 and we knew about it by mid-2020
            (0, vitest_1.expect)((0, temporal_js_1.isBitemporallyValid)(entity, '2020-06-15', '2020-07-01')).toBe(true);
        });
        (0, vitest_1.it)('should return false if not yet recorded', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2021-01-01'),
                recordedAt: new Date('2020-06-01'),
            };
            // We're asking: did we know on 2020-05-01?
            (0, vitest_1.expect)((0, temporal_js_1.isBitemporallyValid)(entity, '2020-03-01', '2020-05-01')).toBe(false);
        });
        (0, vitest_1.it)('should work without transaction time constraint', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2021-01-01'),
                recordedAt: new Date('2020-06-01'),
            };
            (0, vitest_1.expect)((0, temporal_js_1.isBitemporallyValid)(entity, '2020-06-15')).toBe(true);
        });
    });
    (0, vitest_1.describe)('filterEntitiesAsOf', () => {
        (0, vitest_1.it)('should filter entities to those valid at specific time', () => {
            const entities = [
                {
                    id: '1',
                    validFrom: new Date('2020-01-01'),
                    validTo: new Date('2021-01-01'),
                },
                {
                    id: '2',
                    validFrom: new Date('2021-01-01'),
                    validTo: null,
                },
                {
                    id: '3',
                    validFrom: new Date('2019-01-01'),
                    validTo: new Date('2019-12-31'),
                },
            ];
            const asOf2020 = (0, temporal_js_1.filterEntitiesAsOf)(entities, new Date('2020-06-01'));
            (0, vitest_1.expect)(asOf2020).toHaveLength(1);
            (0, vitest_1.expect)(asOf2020[0].id).toBe('1');
        });
        (0, vitest_1.it)('should include entities with null validTo', () => {
            const entities = [
                {
                    id: '1',
                    validFrom: new Date('2020-01-01'),
                    validTo: null,
                },
            ];
            const asOfFuture = (0, temporal_js_1.filterEntitiesAsOf)(entities, new Date('2025-01-01'));
            (0, vitest_1.expect)(asOfFuture).toHaveLength(1);
        });
    });
    (0, vitest_1.describe)('buildGraphSnapshotAtTime', () => {
        (0, vitest_1.it)('should build snapshot with valid nodes and edges', () => {
            const nodes = [
                {
                    id: 'person1',
                    type: 'Person',
                    name: 'Alice',
                    validFrom: new Date('2020-01-01'),
                    validTo: new Date('2021-01-01'),
                },
                {
                    id: 'org1',
                    type: 'Organization',
                    name: 'Company A',
                    validFrom: new Date('2020-01-01'),
                    validTo: null,
                },
                {
                    id: 'person2',
                    type: 'Person',
                    name: 'Bob',
                    validFrom: new Date('2021-01-01'),
                    validTo: null,
                },
            ];
            const edges = [
                {
                    id: 'e1',
                    type: 'memberOf',
                    fromId: 'person1',
                    toId: 'org1',
                    confidence: 1.0,
                    source: 'manual',
                    tenantId: 'tenant1',
                    createdBy: 'user1',
                    updatedBy: null,
                    createdAt: new Date('2020-01-01'),
                    updatedAt: null,
                    validFrom: new Date('2020-01-01'),
                    validTo: new Date('2021-01-01'),
                    recordedAt: new Date('2020-01-01'),
                    properties: {},
                    tags: [],
                },
                {
                    id: 'e2',
                    type: 'memberOf',
                    fromId: 'person2',
                    toId: 'org1',
                    confidence: 1.0,
                    source: 'manual',
                    tenantId: 'tenant1',
                    createdBy: 'user1',
                    updatedBy: null,
                    createdAt: new Date('2021-01-01'),
                    updatedAt: null,
                    validFrom: new Date('2021-01-01'),
                    validTo: null,
                    recordedAt: new Date('2021-01-01'),
                    properties: {},
                    tags: [],
                },
            ];
            const snapshot = (0, temporal_js_1.buildGraphSnapshotAtTime)(nodes, edges, new Date('2020-06-01'));
            (0, vitest_1.expect)(snapshot.nodes).toHaveLength(2); // person1 and org1
            (0, vitest_1.expect)(snapshot.edges).toHaveLength(1); // only e1
            (0, vitest_1.expect)(snapshot.metadata?.nodeCount).toBe(2);
            (0, vitest_1.expect)(snapshot.metadata?.edgeCount).toBe(1);
        });
        (0, vitest_1.it)('should filter out edges connecting to invalid nodes', () => {
            const nodes = [
                {
                    id: 'node1',
                    validFrom: new Date('2020-01-01'),
                    validTo: new Date('2020-12-31'),
                },
                {
                    id: 'node2',
                    validFrom: new Date('2021-01-01'),
                    validTo: null,
                },
            ];
            const edges = [
                {
                    id: 'e1',
                    type: 'relatedTo',
                    fromId: 'node1',
                    toId: 'node2',
                    confidence: 1.0,
                    source: 'manual',
                    tenantId: 'tenant1',
                    createdBy: 'user1',
                    updatedBy: null,
                    createdAt: new Date('2020-01-01'),
                    updatedAt: null,
                    validFrom: new Date('2020-01-01'),
                    validTo: null,
                    recordedAt: new Date('2020-01-01'),
                    properties: {},
                    tags: [],
                },
            ];
            const snapshot = (0, temporal_js_1.buildGraphSnapshotAtTime)(nodes, edges, new Date('2020-06-01'));
            // Only node1 is valid, so edge connecting to node2 should be filtered out
            (0, vitest_1.expect)(snapshot.nodes).toHaveLength(1);
            (0, vitest_1.expect)(snapshot.edges).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('getLatestVersionAt', () => {
        (0, vitest_1.it)('should return most recent valid version', () => {
            const versions = [
                {
                    id: 'v1',
                    name: 'Version 1',
                    validFrom: new Date('2020-01-01'),
                    validTo: new Date('2020-06-01'),
                },
                {
                    id: 'v2',
                    name: 'Version 2',
                    validFrom: new Date('2020-06-01'),
                    validTo: new Date('2021-01-01'),
                },
                {
                    id: 'v3',
                    name: 'Version 3',
                    validFrom: new Date('2021-01-01'),
                    validTo: null,
                },
            ];
            const latest = (0, temporal_js_1.getLatestVersionAt)(versions, new Date('2020-08-01'));
            (0, vitest_1.expect)(latest?.id).toBe('v2');
        });
        (0, vitest_1.it)('should return undefined if no version is valid', () => {
            const versions = [
                {
                    id: 'v1',
                    validFrom: new Date('2020-01-01'),
                    validTo: new Date('2020-06-01'),
                },
            ];
            const latest = (0, temporal_js_1.getLatestVersionAt)(versions, new Date('2019-01-01'));
            (0, vitest_1.expect)(latest).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('getValidityDuration', () => {
        (0, vitest_1.it)('should calculate duration in milliseconds', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2020-01-02'),
            };
            const duration = (0, temporal_js_1.getValidityDuration)(entity);
            (0, vitest_1.expect)(duration).toBe(24 * 60 * 60 * 1000); // 1 day in ms
        });
        (0, vitest_1.it)('should return null for unbounded validity', () => {
            const entity = {
                validFrom: new Date('2020-01-01'),
                validTo: null,
            };
            const duration = (0, temporal_js_1.getValidityDuration)(entity);
            (0, vitest_1.expect)(duration).toBeNull();
        });
    });
});
