"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pipeline_js_1 = require("../../server/src/metering/pipeline.js");
const schema_js_1 = require("../../server/src/metering/schema.js");
const tenant_usage_rollup_js_1 = require("../../server/src/jobs/tenant-usage-rollup.js");
const repository_js_1 = require("../../server/src/metering/repository.js");
describe('Metering pipeline', () => {
    beforeEach(() => {
        pipeline_js_1.meteringPipeline.reset();
        repository_js_1.tenantUsageDailyRepository.clear();
    });
    it('deduplicates events using idempotency key', async () => {
        const event = {
            kind: schema_js_1.MeterEventKind.INGEST_UNITS,
            tenantId: 'acme',
            units: 5,
            source: 'test',
            idempotencyKey: 'abc123',
        };
        await pipeline_js_1.meteringPipeline.enqueue(event);
        await pipeline_js_1.meteringPipeline.enqueue(event);
        const rollups = pipeline_js_1.meteringPipeline.getDailyRollups();
        expect(rollups).toHaveLength(1);
        expect(rollups[0].ingestUnits).toBe(5);
    });
    it('sends invalid events to DLQ and supports replay', async () => {
        await pipeline_js_1.meteringPipeline.enqueue({
            kind: schema_js_1.MeterEventKind.QUERY_CREDITS,
            tenantId: 'acme',
            credits: -1,
            source: 'test',
            correlationId: 'bad',
        });
        expect(pipeline_js_1.meteringPipeline.getDailyRollups()).toHaveLength(0);
        expect(pipeline_js_1.meteringPipeline.getDeadLetters()).toHaveLength(1);
        const replayResult = pipeline_js_1.meteringPipeline.replayDLQ((event) => ({
            ...event,
            credits: Math.abs(event.credits),
        }));
        expect(replayResult.replayed).toBe(1);
        expect(pipeline_js_1.meteringPipeline.getDeadLetters()).toHaveLength(0);
        const rollups = pipeline_js_1.meteringPipeline.getDailyRollups();
        expect(rollups[0].queryCredits).toBe(1);
        expect(rollups[0].correlationIds).toContain('bad');
    });
    it('persists tenant_usage_daily rollups through the job', async () => {
        await pipeline_js_1.meteringPipeline.enqueue({
            kind: schema_js_1.MeterEventKind.STORAGE_BYTES_ESTIMATE,
            tenantId: 'acme',
            bytes: 1024,
            source: 'storage-test',
        });
        await pipeline_js_1.meteringPipeline.enqueue({
            kind: schema_js_1.MeterEventKind.USER_SEAT_ACTIVE,
            tenantId: 'acme',
            seatCount: 2,
            source: 'auth-test',
        });
        await (0, tenant_usage_rollup_js_1.runTenantUsageRollup)();
        const rows = await repository_js_1.tenantUsageDailyRepository.list();
        expect(rows).toHaveLength(1);
        expect(rows[0].storageBytesEstimate).toBe(1024);
        expect(rows[0].activeSeats).toBeGreaterThanOrEqual(2);
    });
});
