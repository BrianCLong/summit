"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pipeline_1 = require("../../src/data-pipeline/pipeline");
const quality_1 = require("../../src/data-pipeline/quality");
const schemaRegistry_1 = require("../../src/data-pipeline/schemaRegistry");
const transforms_1 = require("../../src/data-pipeline/transforms");
const faultInjector_1 = require("../../test/utils/faultInjector");
class FaultySource {
    name;
    injector;
    payload;
    constructor(name, injector, payload) {
        this.name = name;
        this.injector = injector;
        this.payload = payload;
    }
    async load() {
        const fault = this.injector.nextFault();
        if (fault) {
            const error = new Error(fault.message);
            error.code = fault.code;
            error.transient = fault.kind === 'transient';
            throw error;
        }
        return {
            source: this.name,
            records: this.payload,
        };
    }
}
const buildPipeline = (source) => {
    const registry = new schemaRegistry_1.SchemaRegistry();
    registry.register({
        version: '1.0.0',
        schema: {
            type: 'object',
            properties: { id: { type: 'string' }, value: { type: 'number' } },
            required: ['id', 'value'],
        },
    });
    return new pipeline_1.DataPipeline([source], registry, new transforms_1.TransformationPipeline(), new quality_1.DataQualityChecker(), {
        schemaVersion: '1.0.0',
        qualityRules: {},
        deduplicationKey: 'id',
        watermarkField: 'value',
    });
};
describe('chaos harness for ingestion pathways', () => {
    afterEach(() => {
        delete process.env.CHAOS_PROVENANCE_LOGS;
        globals_1.jest.restoreAllMocks();
    });
    it('retries through transient faults and still maps metrics cleanly', async () => {
        const injector = (0, faultInjector_1.createFaultInjector)('transient-seed', 'transient-timeout');
        const pipeline = buildPipeline(new FaultySource('chaos-source', injector, [{ id: 'a', value: 1 }]));
        const outcome = await pipeline.run();
        expect(outcome.processed).toHaveLength(1);
        expect(outcome.deadLetters).toHaveLength(0);
        const metrics = outcome.metrics.find((metric) => metric.source === 'chaos-source');
        expect(metrics?.ingestionErrors ?? 0).toBeLessThanOrEqual(1);
    });
    it('captures permanent failures with stable codes and provenance breadcrumbs', async () => {
        process.env.CHAOS_PROVENANCE_LOGS = 'true';
        const consoleSpy = globals_1.jest.spyOn(console, 'info').mockImplementation();
        const injector = (0, faultInjector_1.createFaultInjector)('permanent-seed', 'permanent-failure');
        const pipeline = buildPipeline(new FaultySource('chaos-source', injector, [{ id: 'b', value: 2 }]));
        const outcome = await pipeline.run();
        expect(outcome.processed).toHaveLength(0);
        expect(outcome.deadLetters).toHaveLength(1);
        expect(outcome.deadLetters[0].errorCode).toBe('INGESTION_PERMANENT_FAILURE');
        expect(outcome.deadLetters[0].provenance?.featureFlag).toBe('CHAOS_PROVENANCE_LOGS');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[chaos][ingestion]'), expect.objectContaining({ errorCode: 'INGESTION_PERMANENT_FAILURE' }));
    });
});
