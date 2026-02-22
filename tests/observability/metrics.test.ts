import {
  registry,
  llmInvocationsTotal,
  llmTokensTotal,
  ingestionRecordsProcessed,
  ingestionThroughputRate,
  recordIngestionThroughput,
  recordLlmInvocation,
  getRequiredMetrics,
} from '../../packages/observability/src/metrics/index';

describe('observability metrics registration', () => {
  beforeEach(() => {
    registry.resetMetrics();
    llmInvocationsTotal.reset();
    llmTokensTotal.reset();
    ingestionRecordsProcessed.reset();
    ingestionThroughputRate.reset();
  });

  it('records LLM invocation counters and latency', async () => {
    recordLlmInvocation('gpt-4', 'openai', 'success', 1.25, 128, 'llm-orchestrator');

    const metrics = await registry.metrics();
    expect(metrics).toContain('llm_invocations_total');
    expect(metrics).toContain('llm_invocation_duration_seconds');
    expect(metrics).toContain('llm_tokens_total');
  });

  it('tracks ingestion throughput and latency', async () => {
    recordIngestionThroughput('pipeline-a', 'stage-1', 500, 5, 'success', 'ingestion-pipeline');

    const metrics = await registry.metrics();
    expect(metrics).toContain('ingestion_records_processed_total');
    expect(metrics).toContain('ingestion_batch_duration_seconds');
    expect(metrics).toContain('ingestion_throughput_records_per_second');
  });

  it('requires LLM metrics for api-service archetypes', () => {
    const required = getRequiredMetrics('api-service');
    expect(required).toContain('llm_invocations_total');
    expect(required).toContain('llm_invocation_duration_seconds');
  });
});
