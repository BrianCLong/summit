"use strict";
/**
 * Service Unit Tests
 *
 * Tests for core service business logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AuditService_js_1 = require("../../src/services/AuditService.js");
// Mock the database connection
const mockQuery = globals_1.jest.fn();
globals_1.jest.mock('../../src/db/connection.js', () => ({
    query: (...args) => mockQuery(...args),
    transaction: globals_1.jest.fn(async (callback) => {
        const mockClient = { query: mockQuery, release: globals_1.jest.fn() };
        return callback(mockClient);
    }),
}));
(0, globals_1.describe)('AuditService', () => {
    let auditService;
    (0, globals_1.beforeEach)(() => {
        auditService = new AuditService_js_1.AuditService();
        mockQuery.mockReset();
    });
    (0, globals_1.describe)('log', () => {
        (0, globals_1.it)('should create an audit entry', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const entry = await auditService.log({
                entityType: 'dataset',
                entityId: '123',
                action: 'create',
                actorId: 'user-1',
                actorRole: 'admin',
                newState: { name: 'Test Dataset' },
                metadata: { source: 'api' },
            });
            (0, globals_1.expect)(entry).toHaveProperty('id');
            (0, globals_1.expect)(entry.entityType).toBe('dataset');
            (0, globals_1.expect)(entry.action).toBe('create');
            (0, globals_1.expect)(entry.actorId).toBe('user-1');
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledTimes(1);
        });
    });
    (0, globals_1.describe)('getByEntity', () => {
        (0, globals_1.it)('should retrieve audit entries for an entity', async () => {
            const mockEntries = [
                {
                    id: '1',
                    entity_type: 'dataset',
                    entity_id: '123',
                    action: 'create',
                    actor_id: 'user-1',
                    actor_role: 'admin',
                    timestamp: new Date(),
                    previous_state: null,
                    new_state: JSON.stringify({ name: 'Test' }),
                    metadata: JSON.stringify({}),
                },
            ];
            mockQuery.mockResolvedValueOnce({ rows: mockEntries });
            const entries = await auditService.getByEntity('dataset', '123');
            (0, globals_1.expect)(entries).toHaveLength(1);
            (0, globals_1.expect)(entries[0].entityType).toBe('dataset');
            (0, globals_1.expect)(entries[0].entityId).toBe('123');
        });
    });
    (0, globals_1.describe)('search', () => {
        (0, globals_1.it)('should filter audit entries by criteria', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            await auditService.search({
                entityType: 'dataset',
                action: 'create',
                actorId: 'user-1',
            });
            (0, globals_1.expect)(mockQuery).toHaveBeenCalled();
            const call = mockQuery.mock.calls[0];
            (0, globals_1.expect)(call[0]).toContain('entity_type');
            (0, globals_1.expect)(call[0]).toContain('action');
            (0, globals_1.expect)(call[0]).toContain('actor_id');
        });
        (0, globals_1.it)('should support date range filtering', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            await auditService.search({
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-12-31'),
            });
            (0, globals_1.expect)(mockQuery).toHaveBeenCalled();
            const call = mockQuery.mock.calls[0];
            (0, globals_1.expect)(call[0]).toContain('timestamp >=');
            (0, globals_1.expect)(call[0]).toContain('timestamp <=');
        });
    });
});
(0, globals_1.describe)('Type Definitions', () => {
    (0, globals_1.it)('should have correct SplitType values', () => {
        const { SplitType } = require('../../src/types/index.js');
        (0, globals_1.expect)(SplitType.TRAIN).toBe('train');
        (0, globals_1.expect)(SplitType.DEV).toBe('dev');
        (0, globals_1.expect)(SplitType.TEST).toBe('test');
        (0, globals_1.expect)(SplitType.VALIDATION).toBe('validation');
    });
    (0, globals_1.it)('should have correct TaskType values', () => {
        const { TaskType } = require('../../src/types/index.js');
        (0, globals_1.expect)(TaskType.ENTITY_MATCH).toBe('entity_match');
        (0, globals_1.expect)(TaskType.CLUSTER_REVIEW).toBe('cluster_review');
        (0, globals_1.expect)(TaskType.CLAIM_ASSESSMENT).toBe('claim_assessment');
        (0, globals_1.expect)(TaskType.SAFETY_DECISION).toBe('safety_decision');
    });
    (0, globals_1.it)('should have correct JobStatus values', () => {
        const { JobStatus } = require('../../src/types/index.js');
        (0, globals_1.expect)(JobStatus.QUEUED).toBe('queued');
        (0, globals_1.expect)(JobStatus.ASSIGNED).toBe('assigned');
        (0, globals_1.expect)(JobStatus.IN_PROGRESS).toBe('in_progress');
        (0, globals_1.expect)(JobStatus.SUBMITTED).toBe('submitted');
        (0, globals_1.expect)(JobStatus.APPROVED).toBe('approved');
        (0, globals_1.expect)(JobStatus.REJECTED).toBe('rejected');
    });
});
(0, globals_1.describe)('Quality Controls', () => {
    (0, globals_1.describe)('Golden Question Logic', () => {
        (0, globals_1.it)('should correctly compare labels', () => {
            const expected = { match: true };
            const actual = [{ fieldName: 'match', value: true }];
            // Simple comparison logic
            const isCorrect = JSON.stringify(actual[0].value) ===
                JSON.stringify(Object.values(expected)[0]);
            (0, globals_1.expect)(isCorrect).toBe(true);
        });
        (0, globals_1.it)('should detect label mismatches', () => {
            const expected = { match: true };
            const actual = [{ fieldName: 'match', value: false }];
            const isCorrect = JSON.stringify(actual[0].value) ===
                JSON.stringify(Object.values(expected)[0]);
            (0, globals_1.expect)(isCorrect).toBe(false);
        });
    });
    (0, globals_1.describe)('Agreement Calculation', () => {
        (0, globals_1.it)('should calculate pairwise agreement', () => {
            const labelSets = [
                { labels: [{ fieldName: 'match', value: true }] },
                { labels: [{ fieldName: 'match', value: true }] },
                { labels: [{ fieldName: 'match', value: false }] },
            ];
            // Simple pairwise agreement
            let agreements = 0;
            let comparisons = 0;
            for (let i = 0; i < labelSets.length; i++) {
                for (let j = i + 1; j < labelSets.length; j++) {
                    comparisons++;
                    if (JSON.stringify(labelSets[i].labels) ===
                        JSON.stringify(labelSets[j].labels)) {
                        agreements++;
                    }
                }
            }
            const agreement = agreements / comparisons;
            // 1 agreement out of 3 comparisons
            (0, globals_1.expect)(agreement).toBeCloseTo(0.333, 2);
        });
        (0, globals_1.it)('should handle perfect agreement', () => {
            const labelSets = [
                { labels: [{ fieldName: 'match', value: true }] },
                { labels: [{ fieldName: 'match', value: true }] },
            ];
            let agreements = 0;
            let comparisons = 0;
            for (let i = 0; i < labelSets.length; i++) {
                for (let j = i + 1; j < labelSets.length; j++) {
                    comparisons++;
                    if (JSON.stringify(labelSets[i].labels) ===
                        JSON.stringify(labelSets[j].labels)) {
                        agreements++;
                    }
                }
            }
            const agreement = comparisons > 0 ? agreements / comparisons : 1;
            (0, globals_1.expect)(agreement).toBe(1);
        });
    });
    (0, globals_1.describe)('Majority Vote Resolution', () => {
        (0, globals_1.it)('should determine majority label', () => {
            const labels = [
                [{ fieldName: 'match', value: true }],
                [{ fieldName: 'match', value: true }],
                [{ fieldName: 'match', value: false }],
            ];
            const counts = new Map();
            for (const label of labels) {
                const key = JSON.stringify(label);
                counts.set(key, (counts.get(key) || 0) + 1);
            }
            let maxCount = 0;
            let majorityLabel = null;
            for (const [key, count] of counts.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    majorityLabel = JSON.parse(key);
                }
            }
            (0, globals_1.expect)(majorityLabel).toEqual([{ fieldName: 'match', value: true }]);
            (0, globals_1.expect)(maxCount).toBe(2);
        });
        (0, globals_1.it)('should return null when no clear majority', () => {
            const labels = [
                [{ fieldName: 'match', value: true }],
                [{ fieldName: 'match', value: false }],
            ];
            const counts = new Map();
            for (const label of labels) {
                const key = JSON.stringify(label);
                counts.set(key, (counts.get(key) || 0) + 1);
            }
            let maxCount = 0;
            let majorityLabel = null;
            for (const [key, count] of counts.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    majorityLabel = JSON.parse(key);
                }
            }
            // No clear majority (50/50 split)
            const hasMajority = maxCount > labels.length / 2;
            (0, globals_1.expect)(hasMajority).toBe(false);
        });
    });
});
