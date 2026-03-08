"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextBuildLatency = exports.retrievalQueriesTotal = exports.dlqRecordsTotal = exports.recordsProcessedTotal = exports.pipelineRunsTotal = void 0;
const prom_client_1 = require("prom-client");
exports.pipelineRunsTotal = new prom_client_1.Counter({
    name: 'summit_ingestion_pipeline_runs_total',
    help: 'Total number of pipeline runs',
    labelNames: ['pipelineKey', 'status', 'tenantId'],
});
exports.recordsProcessedTotal = new prom_client_1.Counter({
    name: 'summit_ingestion_records_processed_total',
    help: 'Total records processed by stage',
    labelNames: ['pipelineKey', 'stage', 'status', 'tenantId'],
});
exports.dlqRecordsTotal = new prom_client_1.Counter({
    name: 'summit_ingestion_dlq_records_total',
    help: 'Total records sent to DLQ',
    labelNames: ['pipelineKey', 'reason', 'tenantId'],
});
exports.retrievalQueriesTotal = new prom_client_1.Counter({
    name: 'summit_rag_retrieval_queries_total',
    help: 'Total RAG retrieval queries',
    labelNames: ['tenantId', 'strategy'], // vector, keyword, hybrid
});
exports.contextBuildLatency = new prom_client_1.Histogram({
    name: 'summit_rag_context_build_latency_seconds',
    help: 'Latency of building RAG context',
    labelNames: ['tenantId'],
    buckets: [0.1, 0.5, 1, 2, 5],
});
