"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../packages/observability/src/metrics/index");
describe('observability metrics registration', () => {
    beforeEach(() => {
        index_1.registry.resetMetrics();
        index_1.llmInvocationsTotal.reset();
        index_1.llmTokensTotal.reset();
        index_1.ingestionRecordsProcessed.reset();
        index_1.ingestionThroughputRate.reset();
    });
    it('records LLM invocation counters and latency', async () => {
        (0, index_1.recordLlmInvocation)('gpt-4', 'openai', 'success', 1.25, 128, 'llm-orchestrator');
        const metrics = await index_1.registry.metrics();
        expect(metrics).toContain('llm_invocations_total');
        expect(metrics).toContain('llm_invocation_duration_seconds');
        expect(metrics).toContain('llm_tokens_total');
    });
    it('tracks ingestion throughput and latency', async () => {
        (0, index_1.recordIngestionThroughput)('pipeline-a', 'stage-1', 500, 5, 'success', 'ingestion-pipeline');
        const metrics = await index_1.registry.metrics();
        expect(metrics).toContain('ingestion_records_processed_total');
        expect(metrics).toContain('ingestion_batch_duration_seconds');
        expect(metrics).toContain('ingestion_throughput_records_per_second');
    });
    it('requires LLM metrics for api-service archetypes', () => {
        const required = (0, index_1.getRequiredMetrics)('api-service');
        expect(required).toContain('llm_invocations_total');
        expect(required).toContain('llm_invocation_duration_seconds');
    });
});
