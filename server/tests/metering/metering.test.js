"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Define mocks before jest.mock calls (Jest hoists these automatically)
const mockSaveAll = globals_1.jest.fn().mockImplementation(async () => undefined);
const mockList = globals_1.jest.fn().mockImplementation(async () => []);
const mockAppend = globals_1.jest.fn().mockImplementation(async () => undefined);
// Mock logger to avoid clutter
globals_1.jest.mock('../../src/utils/logger.js', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
    },
}));
// Mock persistence
globals_1.jest.mock('../../src/metering/persistence.js', () => {
    return {
        persistentUsageRepository: {
            saveAll: mockSaveAll,
            list: mockList
        },
        meterStore: {
            append: mockAppend
        },
        FileTenantUsageRepository: globals_1.jest.fn(),
        FileMeterStore: globals_1.jest.fn()
    };
});
const pipeline_js_1 = require("../../src/metering/pipeline.js");
const schema_js_1 = require("../../src/metering/schema.js");
const quotas_js_1 = require("../../src/metering/quotas.js");
(0, globals_1.describe)('Metering Subsystem', () => {
    (0, globals_1.describe)('MeteringPipeline', () => {
        let pipeline;
        (0, globals_1.beforeEach)(() => {
            pipeline = new pipeline_js_1.MeteringPipeline();
            globals_1.jest.clearAllMocks();
        });
        (0, globals_1.it)('should aggregate events correctly into daily rollups', async () => {
            const tenantId = 'tenant-1';
            const event1 = {
                kind: schema_js_1.MeterEventKind.QUERY_CREDITS,
                tenantId,
                source: 'test',
                credits: 5,
                occurredAt: new Date('2023-10-27T10:00:00Z'),
                idempotencyKey: 'evt-1'
            };
            const event2 = {
                kind: schema_js_1.MeterEventKind.QUERY_CREDITS,
                tenantId,
                source: 'test',
                credits: 3,
                occurredAt: new Date('2023-10-27T11:00:00Z'),
                idempotencyKey: 'evt-2'
            };
            await pipeline.enqueue(event1);
            await pipeline.enqueue(event2);
            const rollups = pipeline.getDailyRollups();
            (0, globals_1.expect)(rollups).toHaveLength(1);
            (0, globals_1.expect)(rollups[0]).toMatchObject({
                tenantId,
                date: '2023-10-27',
                queryCredits: 8,
            });
            // Verify persistence was called
            (0, globals_1.expect)(mockAppend).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should handle idempotency (ignore duplicate keys)', async () => {
            const event = {
                kind: schema_js_1.MeterEventKind.INGEST_UNITS,
                tenantId: 'tenant-1',
                source: 'test',
                units: 1,
                idempotencyKey: 'same-key'
            };
            await pipeline.enqueue(event);
            await pipeline.enqueue(event);
            const rollups = pipeline.getDailyRollups();
            (0, globals_1.expect)(rollups).toHaveLength(1);
            (0, globals_1.expect)(rollups[0].ingestUnits).toBe(1);
        });
        (0, globals_1.it)('should separate tenants and dates', async () => {
            const t1d1 = { kind: schema_js_1.MeterEventKind.QUERY_CREDITS, tenantId: 't1', source: 'test', credits: 1, occurredAt: new Date('2023-10-01') };
            const t1d2 = { kind: schema_js_1.MeterEventKind.QUERY_CREDITS, tenantId: 't1', source: 'test', credits: 1, occurredAt: new Date('2023-10-02') };
            const t2d1 = { kind: schema_js_1.MeterEventKind.QUERY_CREDITS, tenantId: 't2', source: 'test', credits: 1, occurredAt: new Date('2023-10-01') };
            await pipeline.enqueue(t1d1);
            await pipeline.enqueue(t1d2);
            await pipeline.enqueue(t2d1);
            const rollups = pipeline.getDailyRollups();
            (0, globals_1.expect)(rollups).toHaveLength(3);
        });
    });
    (0, globals_1.describe)('QuotaManager', () => {
        let quotaManager;
        (0, globals_1.beforeEach)(() => {
            quotaManager = new quotas_js_1.QuotaManager();
            globals_1.jest.clearAllMocks();
        });
        (0, globals_1.it)('should allow request if no quota set', async () => {
            const result = await quotaManager.checkQuota('unknown-tenant', 'queryExecuted', 1);
            (0, globals_1.expect)(result.allowed).toBe(true);
            (0, globals_1.expect)(result.softExceeded).toBe(false);
        });
        (0, globals_1.it)('should detect soft limit breach', async () => {
            const tenantId = 't-soft';
            await quotaManager.setQuotaOverride(tenantId, {
                queryExecuted: { soft: 10, hard: 20 }
            });
            // Mock current usage from PERSISTENT repo
            mockList.mockImplementationOnce(async () => [
                {
                    tenantId,
                    date: new Date().toISOString().slice(0, 10),
                    queryExecuted: 15,
                },
            ]);
            const result = await quotaManager.checkQuota(tenantId, 'queryExecuted', 1);
            (0, globals_1.expect)(result.allowed).toBe(true);
            (0, globals_1.expect)(result.softExceeded).toBe(true);
            (0, globals_1.expect)(result.message).toContain('Soft quota exceeded');
        });
        (0, globals_1.it)('should detect hard limit breach', async () => {
            const tenantId = 't-hard';
            await quotaManager.setQuotaOverride(tenantId, {
                queryExecuted: { soft: 10, hard: 20 }
            });
            mockList.mockImplementationOnce(async () => [
                {
                    tenantId,
                    date: new Date().toISOString().slice(0, 10),
                    queryExecuted: 20,
                },
            ]);
            const result = await quotaManager.checkQuota(tenantId, 'queryExecuted', 1);
            (0, globals_1.expect)(result.allowed).toBe(false);
            (0, globals_1.expect)(result.softExceeded).toBe(true);
            (0, globals_1.expect)(result.message).toContain('Hard quota exceeded');
        });
    });
});
