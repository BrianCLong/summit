"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pipeline_js_1 = require("../pipeline.js");
const postgres_repository_js_1 = require("../postgres-repository.js");
const schema_js_1 = require("../schema.js");
// Mock dependencies
globals_1.jest.mock('../../utils/logger.js', () => ({
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    info: globals_1.jest.fn(),
}));
globals_1.jest.mock('../postgres-repository.js', () => ({
    postgresMeterRepository: {
        recordEvent: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('MeteringPipeline', () => {
    let pipeline;
    const mockRecordEvent = postgres_repository_js_1.postgresMeterRepository.recordEvent;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        pipeline = new pipeline_js_1.MeteringPipeline();
    });
    (0, globals_1.it)('should process a valid event and persist it', async () => {
        const event = {
            tenantId: 't1',
            kind: schema_js_1.MeterEventKind.INGEST_UNITS,
            units: 10,
            source: 'test',
        };
        mockRecordEvent.mockResolvedValue(true); // Successfully inserted
        await pipeline.enqueue(event);
        (0, globals_1.expect)(mockRecordEvent).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            tenantId: 't1',
            kind: 'ingest.units',
            units: 10
        }));
        const rollups = pipeline.getDailyRollups();
        (0, globals_1.expect)(rollups).toHaveLength(1);
        (0, globals_1.expect)(rollups[0].ingestUnits).toBe(10);
    });
    (0, globals_1.it)('should not rollup if db says duplicate', async () => {
        const event = {
            tenantId: 't1',
            kind: schema_js_1.MeterEventKind.INGEST_UNITS,
            units: 10,
            source: 'test',
            idempotencyKey: 'dup-key'
        };
        mockRecordEvent.mockResolvedValue(false); // Duplicate
        await pipeline.enqueue(event);
        (0, globals_1.expect)(mockRecordEvent).toHaveBeenCalled();
        const rollups = pipeline.getDailyRollups();
        (0, globals_1.expect)(rollups).toHaveLength(0); // Should be empty
    });
    (0, globals_1.it)('should log db error and continue processing rollups', async () => {
        const event = {
            tenantId: 't1',
            kind: schema_js_1.MeterEventKind.INGEST_UNITS,
            units: 10,
            source: 'test',
        };
        mockRecordEvent.mockRejectedValue(new Error('DB connection failed'));
        await pipeline.enqueue(event);
        (0, globals_1.expect)(mockRecordEvent).toHaveBeenCalled();
        const rollups = pipeline.getDailyRollups();
        (0, globals_1.expect)(rollups).toHaveLength(1);
        const dlq = pipeline.getDeadLetters();
        (0, globals_1.expect)(dlq).toHaveLength(0);
    });
});
