import { Counter, Histogram } from 'prom-client';

export const pipelineRunsTotal = new Counter({
  name: 'summit_ingestion_pipeline_runs_total',
  help: 'Total number of pipeline runs',
  labelNames: ['pipelineKey', 'status', 'tenantId'],
});

export const recordsProcessedTotal = new Counter({
  name: 'summit_ingestion_records_processed_total',
  help: 'Total records processed by stage',
  labelNames: ['pipelineKey', 'stage', 'status', 'tenantId'],
});

export const dlqRecordsTotal = new Counter({
  name: 'summit_ingestion_dlq_records_total',
  help: 'Total records sent to DLQ',
  labelNames: ['pipelineKey', 'reason', 'tenantId'],
});

export const retrievalQueriesTotal = new Counter({
  name: 'summit_rag_retrieval_queries_total',
  help: 'Total RAG retrieval queries',
  labelNames: ['tenantId', 'strategy'], // vector, keyword, hybrid
});

export const contextBuildLatency = new Histogram({
  name: 'summit_rag_context_build_latency_seconds',
  help: 'Latency of building RAG context',
  labelNames: ['tenantId'],
  buckets: [0.1, 0.5, 1, 2, 5],
});
