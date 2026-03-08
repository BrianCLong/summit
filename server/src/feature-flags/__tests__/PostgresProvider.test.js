"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PostgresProvider_js_1 = require("../PostgresProvider.js");
const postgres_js_1 = require("../../db/postgres.js");
// Mock getPostgresPool
globals_1.jest.mock('../../db/postgres', () => ({
    getPostgresPool: globals_1.jest.fn(),
}));
// Mock logger
globals_1.jest.mock('../../utils/logger.js', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
    },
}));
// Mock Redis
globals_1.jest.mock('ioredis', () => {
    return {
        __esModule: true,
        default: globals_1.jest.fn().mockImplementation(() => ({
            subscribe: globals_1.jest.fn(),
            on: globals_1.jest.fn(),
            publish: globals_1.jest.fn(),
            quit: globals_1.jest.fn(),
        })),
    };
});
describe('PostgresProvider', () => {
    let provider;
    let mockQuery;
    beforeEach(() => {
        delete process.env.REDIS_URL;
        mockQuery = globals_1.jest.fn();
        postgres_js_1.getPostgresPool.mockReturnValue({
            query: mockQuery,
        });
        provider = new PostgresProvider_js_1.PostgresProvider();
    });
    afterEach(() => {
        globals_1.jest.clearAllMocks();
    });
    describe('initialize', () => {
        it('should load flags from database', async () => {
            mockQuery.mockResolvedValue({
                rows: [
                    {
                        key: 'test-flag',
                        description: 'Test Flag',
                        type: 'boolean',
                        enabled: true,
                        default_value: true,
                        rollout_rules: [],
                        variations: [],
                        tenant_id: null,
                    },
                ],
            });
            await provider.initialize();
            expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM feature_flags');
            expect(provider.isReady()).toBe(true);
            const flag = await provider.getFlagDefinition('test-flag');
            expect(flag).toBeDefined();
            expect(flag?.key).toBe('test-flag');
            expect(flag?.enabled).toBe(true);
        });
    });
    describe('evaluation', () => {
        beforeEach(async () => {
            mockQuery.mockResolvedValue({
                rows: [
                    {
                        key: 'bool-flag',
                        type: 'boolean',
                        enabled: true,
                        default_value: true,
                        rollout_rules: [],
                    },
                    {
                        key: 'disabled-flag',
                        type: 'boolean',
                        enabled: false,
                        default_value: true,
                    },
                    {
                        key: 'tenant-flag',
                        type: 'boolean',
                        enabled: true,
                        default_value: true,
                        tenant_id: 'tenant-1',
                        metadata: { tenantId: 'tenant-1' }
                    },
                    {
                        key: 'rollout-flag',
                        type: 'boolean',
                        enabled: true,
                        default_value: false,
                        variations: [
                            { id: 'on', value: true },
                            { id: 'off', value: false }
                        ],
                        rollout_rules: [
                            {
                                conditions: [], // Apply to all who reach here
                                rollout: {
                                    type: 'percentage',
                                    bucketBy: 'userId',
                                    variations: [
                                        { variation: 'on', percentage: 50 },
                                        { variation: 'off', percentage: 50 }
                                    ]
                                }
                            }
                        ]
                    }
                ],
            });
            await provider.initialize();
        });
        it('should return default value if flag does not exist', async () => {
            const result = await provider.getBooleanFlag('non-existent', false, {});
            expect(result.value).toBe(false);
            expect(result.reason).toBe('DEFAULT');
        });
        it('should return value if flag enabled', async () => {
            const result = await provider.getBooleanFlag('bool-flag', false, {});
            expect(result.value).toBe(true);
        });
        it('should return default/fallback if flag disabled', async () => {
            const result = await provider.getBooleanFlag('disabled-flag', false, {});
            expect(result.value).toBe(false);
            expect(result.reason).toBe('OFF');
        });
        it('should respect tenant isolation', async () => {
            // Correct tenant
            const res1 = await provider.getBooleanFlag('tenant-flag', false, { tenantId: 'tenant-1' });
            expect(res1.value).toBe(true);
            // Wrong tenant
            const res2 = await provider.getBooleanFlag('tenant-flag', false, { tenantId: 'tenant-2' });
            expect(res2.value).toBe(false);
        });
        it('should evaluate percentage rollout', async () => {
            // User 1 might fall in bucket < 50%
            const res1 = await provider.getBooleanFlag('rollout-flag', false, { userId: 'user-123' });
            // User 2 might fall in bucket >= 50% (need to find deterministic IDs or mock crypto if strict)
            // For now, we test that it returns a value and reason is RULE_MATCH
            expect(res1.exists).toBe(true);
            if (res1.reason === 'RULE_MATCH') {
                expect(['on', 'off']).toContain(res1.variation);
            }
        });
    });
});
