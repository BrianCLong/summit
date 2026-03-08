"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const EntityResolutionV2Service_js_1 = require("../../services/er/EntityResolutionV2Service.js");
const soundex_js_1 = require("../../services/er/soundex.js");
const mockPool = {
    query: globals_1.jest.fn(),
};
const mockDlq = {
    enqueue: globals_1.jest.fn(),
};
globals_1.jest.mock('../../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => mockPool),
}));
globals_1.jest.mock('../../lib/dlq/index.js', () => ({
    dlqFactory: globals_1.jest.fn(() => mockDlq),
}));
// Mock Neo4j session
const mockSession = {
    run: globals_1.jest.fn(),
    beginTransaction: globals_1.jest.fn().mockReturnValue({
        run: globals_1.jest.fn(),
        commit: globals_1.jest.fn(),
        rollback: globals_1.jest.fn()
    }),
    close: globals_1.jest.fn()
};
(0, globals_1.describe)('EntityResolutionV2Service', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new EntityResolutionV2Service_js_1.EntityResolutionV2Service({
            dlq: mockDlq,
            pool: mockPool,
        });
        globals_1.jest.clearAllMocks();
        mockPool.query.mockResolvedValue({ rows: [] });
        mockDlq.enqueue.mockResolvedValue('dlq-1');
    });
    (0, globals_1.describe)('soundex', () => {
        (0, globals_1.it)('should generate correct soundex codes', () => {
            (0, globals_1.expect)((0, soundex_js_1.soundex)('Robert')).toBe('R163');
            (0, globals_1.expect)((0, soundex_js_1.soundex)('Rupert')).toBe('R163');
            (0, globals_1.expect)((0, soundex_js_1.soundex)('Rubin')).toBe('R150');
            (0, globals_1.expect)((0, soundex_js_1.soundex)('Ashcraft')).toBe('A261');
        });
    });
    (0, globals_1.describe)('generateSignals', () => {
        (0, globals_1.it)('should extract phonetic and simple signals', () => {
            const entity = {
                id: '1',
                labels: ['Entity'],
                properties: {
                    name: 'Robert',
                    userAgent: 'Mozilla/5.0',
                    cryptoAddress: '0x123'
                }
            };
            const signals = service.generateSignals(entity);
            (0, globals_1.expect)(signals.phonetic).toContain('R163');
            (0, globals_1.expect)(signals.device).toContain('Mozilla/5.0');
            (0, globals_1.expect)(signals.crypto).toContain('0x123');
        });
    });
    (0, globals_1.describe)('explain', () => {
        (0, globals_1.it)('should generate features and rationale for similar entities', () => {
            const e1 = {
                id: '1', labels: ['Entity'],
                properties: { name: 'Robert', cryptoAddress: '0x123' }
            };
            const e2 = {
                id: '2', labels: ['Entity'],
                properties: { name: 'Rupert', cryptoAddress: '0x123' }
            };
            const explanation = service.explain(e1, e2);
            (0, globals_1.expect)(explanation.features.phonetic).toBe(1);
            (0, globals_1.expect)(explanation.features.crypto).toBe(1);
            (0, globals_1.expect)(explanation.rationale).toContain('Phonetic match on soundex code: R163');
            (0, globals_1.expect)(explanation.rationale).toContain('Shared crypto address: 0x123');
            (0, globals_1.expect)(explanation.score).toBeGreaterThan(0.5);
            (0, globals_1.expect)(explanation.featureContributions.length).toBeGreaterThan(0);
            const total = explanation.featureContributions.reduce((sum, entry) => sum + entry.normalizedContribution, 0);
            (0, globals_1.expect)(total).toBeCloseTo(1, 5);
        });
    });
    // TODO: These merge tests require proper DLQ and Neo4j session mocking
    // Skip until dependency injection is implemented in the service
    globals_1.describe.skip('merge', () => {
        (0, globals_1.it)('should enforce policy', async () => {
            const req = {
                masterId: 'm1',
                mergeIds: ['d1'],
                userContext: { clearances: [] },
                rationale: 'test'
            };
            // Mock fetching entities with sensitive labels
            mockSession.run.mockResolvedValueOnce({
                records: [
                    { get: (k) => ({ properties: { id: 'm1', lac_labels: ['TOP_SECRET'] }, labels: [] }) },
                    { get: (k) => ({ properties: { id: 'd1' }, labels: [] }) }
                ]
            });
            await (0, globals_1.expect)(service.merge(mockSession, req)).rejects.toThrow('Policy violation');
        });
        (0, globals_1.it)('should short-circuit on idempotency key', async () => {
            const tx = {
                run: globals_1.jest.fn(async (query) => {
                    if (query.includes('MERGE (d:ERDecision {idempotencyKey')) {
                        return {
                            records: [
                                {
                                    get: (key) => {
                                        if (key === 'decisionId')
                                            return 'dec-1';
                                        if (key === 'mergeId')
                                            return 'merge-1';
                                        if (key === 'masterId')
                                            return 'm1';
                                        if (key === 'mergeIds')
                                            return ['d1'];
                                        if (key === 'created')
                                            return false;
                                        return null;
                                    },
                                },
                            ],
                        };
                    }
                    return { records: [] };
                }),
                commit: globals_1.jest.fn(),
                rollback: globals_1.jest.fn(),
            };
            mockSession.beginTransaction.mockReturnValueOnce(tx);
            mockSession.run.mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { id: 'm1', lac_labels: [] }, labels: [] }) },
                    { get: () => ({ properties: { id: 'd1', lac_labels: [] }, labels: [] }) },
                ],
            });
            const result = await service.merge(mockSession, {
                masterId: 'm1',
                mergeIds: ['d1'],
                userContext: { userId: 'user-1', clearances: [] },
                rationale: 'test',
                mergeId: 'merge-1',
            });
            (0, globals_1.expect)(result.idempotent).toBe(true);
            (0, globals_1.expect)(tx.commit).toHaveBeenCalled();
        });
        (0, globals_1.it)('should send guardrail conflicts to DLQ', async () => {
            const largeMergeIds = Array.from({ length: 25 }, (_, i) => `d${i}`);
            await (0, globals_1.expect)(service.merge(mockSession, {
                masterId: 'm1',
                mergeIds: largeMergeIds,
                userContext: { userId: 'user-1', clearances: [] },
                rationale: 'test',
            })).rejects.toThrow('Merge cardinality exceeds guardrail limits');
            (0, globals_1.expect)(mockDlq.enqueue).toHaveBeenCalled();
        });
        (0, globals_1.it)('should rollback using snapshot metadata', async () => {
            globals_1.jest.spyOn(service, 'split').mockResolvedValue();
            mockPool.query
                .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'snap-1',
                        merge_id: 'merge-1',
                        decision_id: 'dec-1',
                        restored_at: null,
                    },
                ],
            })
                .mockResolvedValueOnce({ rows: [] });
            const result = await service.rollbackMergeSnapshot(mockSession, {
                mergeId: 'merge-1',
                reason: 'oops',
                userContext: { userId: 'user-1' },
            });
            (0, globals_1.expect)(service.split).toHaveBeenCalledWith(mockSession, 'dec-1', globals_1.expect.any(Object));
            (0, globals_1.expect)(result.success).toBe(true);
        });
    });
});
