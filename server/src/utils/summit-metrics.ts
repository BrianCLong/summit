import {
  Counter,
  Histogram,
  Meter,
  metrics as otelMetrics,
  ValueType,
} from '@opentelemetry/api';

class SummitMetrics {
  private meter: Meter;
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  constructor() {
    this.meter = otelMetrics.getMeter('intelgraph-server-metrics');
  }

  private getCounter(name: string, description: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(
        name,
        this.meter.createCounter(name, {
          description,
          valueType: ValueType.INT,
        }),
      );
    }
    return this.counters.get(name)!;
  }

  private getHistogram(name: string, description: string): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(
        name,
        this.meter.createHistogram(name, {
          description,
          valueType: ValueType.DOUBLE,
        }),
      );
    }
    return this.histograms.get(name)!;
  }

  // --- HTTP / API Metrics ---

  public httpRequestsTotal(
    labels: { service: string; route: string; method: string; status: number|string, tenantId?: string },
  ) {
    this.getCounter('summit_http_requests_total', 'Total HTTP requests').add(
      1,
      { ...labels, status: String(labels.status) },
    );
  }

  public httpRequestDuration(
    labels: { service: string; route: string; method: string, tenantId?: string },
    durationSeconds: number,
  ) {
    this.getHistogram(
      'summit_http_request_duration_seconds',
      'HTTP request duration in seconds',
    ).record(durationSeconds, labels);
  }

  public httpActiveRequests(
    labels: { service: string },
    value: number
  ) {
      // Note: OTel Counters are monotonic. For active requests (gauge), we need UpDownCounter.
      // But for simplicity in this MVP, we might skip or implement later.
      // Let's use a specialized method if needed.
  }


  // --- Maestro Metrics ---

  public maestroRunsTotal(
      labels: { status: string; templateKey: string; tenantId?: string }
  ) {
      this.getCounter('summit_maestro_runs_total', 'Total Maestro runs').add(1, labels);
  }

  public maestroRunDuration(
      labels: { status: string; templateKey: string; tenantId?: string },
      durationSeconds: number
  ) {
      this.getHistogram('summit_maestro_run_duration_seconds', 'Maestro run duration').record(durationSeconds, labels);
  }

  public maestroTasksTotal(
      labels: { status: string; taskKind: string; tenantId?: string }
  ) {
      this.getCounter('summit_maestro_tasks_total', 'Total Maestro tasks').add(1, labels);
  }

  // --- Ingestion Metrics ---

  public ingestionPipelineRunsTotal(
      labels: { pipelineKey: string; status: string; tenantId?: string }
  ) {
      this.getCounter('summit_ingestion_pipeline_runs_total', 'Total ingestion pipeline runs').add(1, labels);
  }

  public ingestionRecordsProcessedTotal(
      labels: { pipelineKey: string; stage: string; status: string; tenantId?: string },
      count: number = 1
  ) {
      this.getCounter('summit_ingestion_records_processed_total', 'Total ingestion records processed').add(count, labels);
  }

  // --- Graph Metrics ---

  public graphQueriesTotal(
      labels: { kind: string; tenantId?: string }
  ) {
      this.getCounter('summit_graph_queries_total', 'Total graph queries').add(1, labels);
  }

  public graphQueryDuration(
      labels: { kind: string; tenantId?: string },
      durationSeconds: number
  ) {
      this.getHistogram('summit_graph_query_duration_seconds', 'Graph query duration').record(durationSeconds, labels);
  }

  // --- LLM Metrics ---

  public llmRequestsTotal(
      labels: { provider: string; model: string; purpose: string; riskLevel?: string; status: string; tenantId?: string }
  ) {
      this.getCounter('summit_llm_requests_total', 'Total LLM requests').add(1, labels);
  }

  public llmRequestDuration(
      labels: { provider: string; model: string; tenantId?: string },
      durationSeconds: number
  ) {
      this.getHistogram('summit_llm_request_duration_seconds', 'LLM request duration').record(durationSeconds, labels);
  }

  public llmTokensTotal(
      labels: { provider: string; model: string; type: "input" | "output" | "total"; tenantId?: string },
      count: number
  ) {
      this.getCounter('summit_llm_tokens_total', 'Total LLM tokens').add(count, labels);
  }

  // --- External API Metrics ---

  public externalApiRequestsTotal(
      labels: { route: string; method: string; status: string|number; tenantId?: string }
  ) {
      this.getCounter('summit_external_api_requests_total', 'Total external API requests').add(1, { ...labels, status: String(labels.status) });
  }

  public externalApiLatency(
      labels: { route: string; tenantId?: string },
      durationSeconds: number
  ) {
      this.getHistogram('summit_external_api_latency_seconds', 'External API latency').record(durationSeconds, labels);
  }
}

export const summitMetrics = new SummitMetrics();
