"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summitMetrics = void 0;
// @ts-nocheck
const api_1 = require("@opentelemetry/api");
class SummitMetrics {
    meter;
    counters = new Map();
    histograms = new Map();
    constructor() {
        this.meter = api_1.metrics.getMeter('intelgraph-server-metrics');
    }
    getCounter(name, description) {
        if (!this.counters.has(name)) {
            this.counters.set(name, this.meter.createCounter(name, {
                description,
                valueType: api_1.ValueType.INT,
            }));
        }
        return this.counters.get(name);
    }
    getHistogram(name, description) {
        if (!this.histograms.has(name)) {
            this.histograms.set(name, this.meter.createHistogram(name, {
                description,
                valueType: api_1.ValueType.DOUBLE,
            }));
        }
        return this.histograms.get(name);
    }
    // --- HTTP / API Metrics ---
    httpRequestsTotal(labels) {
        this.getCounter('summit_http_requests_total', 'Total HTTP requests').add(1, { ...labels, status: String(labels.status) });
    }
    httpRequestDuration(labels, durationSeconds) {
        this.getHistogram('summit_http_request_duration_seconds', 'HTTP request duration in seconds').record(durationSeconds, labels);
    }
    httpActiveRequests(labels, value) {
        // Note: OTel Counters are monotonic. For active requests (gauge), we need UpDownCounter.
        // But for simplicity in this MVP, we might skip or implement later.
        // Let's use a specialized method if needed.
    }
    // --- Maestro Metrics ---
    maestroRunsTotal(labels) {
        this.getCounter('summit_maestro_runs_total', 'Total Maestro runs').add(1, labels);
    }
    maestroRunDuration(labels, durationSeconds) {
        this.getHistogram('summit_maestro_run_duration_seconds', 'Maestro run duration').record(durationSeconds, labels);
    }
    maestroTasksTotal(labels) {
        this.getCounter('summit_maestro_tasks_total', 'Total Maestro tasks').add(1, labels);
    }
    // --- Ingestion Metrics ---
    ingestionPipelineRunsTotal(labels) {
        this.getCounter('summit_ingestion_pipeline_runs_total', 'Total ingestion pipeline runs').add(1, labels);
    }
    ingestionRecordsProcessedTotal(labels, count = 1) {
        this.getCounter('summit_ingestion_records_processed_total', 'Total ingestion records processed').add(count, labels);
    }
    // --- Graph Metrics ---
    graphQueriesTotal(labels) {
        this.getCounter('summit_graph_queries_total', 'Total graph queries').add(1, labels);
    }
    graphQueryDuration(labels, durationSeconds) {
        this.getHistogram('summit_graph_query_duration_seconds', 'Graph query duration').record(durationSeconds, labels);
    }
    // --- LLM Metrics ---
    llmRequestsTotal(labels) {
        this.getCounter('summit_llm_requests_total', 'Total LLM requests').add(1, labels);
    }
    llmRequestDuration(labels, durationSeconds) {
        this.getHistogram('summit_llm_request_duration_seconds', 'LLM request duration').record(durationSeconds, labels);
    }
    llmTokensTotal(labels, count) {
        this.getCounter('summit_llm_tokens_total', 'Total LLM tokens').add(count, labels);
    }
    // --- External API Metrics ---
    externalApiRequestsTotal(labels) {
        this.getCounter('summit_external_api_requests_total', 'Total external API requests').add(1, { ...labels, status: String(labels.status) });
    }
    externalApiLatency(labels, durationSeconds) {
        this.getHistogram('summit_external_api_latency_seconds', 'External API latency').record(durationSeconds, labels);
    }
}
exports.summitMetrics = new SummitMetrics();
