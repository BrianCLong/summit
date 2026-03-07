# CompanyOS FinOps Model v0

## Purpose and Operating Principles

- Make cost, capacity, and performance visible per tenant, feature, and team with ≤24h latency for spend signals and ≤1h for performance regressions.
- Default to **tagged-by-design** resources (tenant, feature, team, environment) and **event-first telemetry** (metering, traces, provenance) to align cost with business value.
- Couple performance SLOs to cost guardrails: every SLO has an associated performance budget (CPU/ms, GB transferred, $/request) and an acceptable cost band.
- Bias toward automation: budgets, anomaly detection, and rightsizing recommendations should flow into tickets/feature flags automatically, with humans in the loop for approval.

## 1) Cost Model

### Cost Drivers and Normalization

| Driver      | Examples                                        | Measurement                                    | Normalization                                                                         |
| ----------- | ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Compute     | K8s nodes/pods, serverless invocations, GPUs    | CPU-seconds, RAM-GB-hours, GPU-hours, replicas | Unit costs from provider price sheets; apply amortization for reserved/committed use. |
| Storage     | Object, block, DB, caches                       | GB-months, IOPS, read/write ops                | Blend hot/cold tiers; include snapshot/backup multipliers.                            |
| Network     | Egress, cross-AZ/region traffic, CDN, messaging | GB transferred, requests                       | Distinguish intra-vs-inter region; tag by service/tenant edge.                        |
| Third-Party | LLM API, auth, observability, SaaS              | API calls, seats, credits                      | Normalize to per-call or per-tenant seat cost; include FX/markup.                     |

### Attribution Rules

- **Primary key:** `(tenant, environment, feature, service, team)` enforced via required resource labels/annotations and trace attributes.
- **Direct costs:** Use provider tags → cost table; join with service ownership registry (CODEOWNERS) for team mapping.
- **Shared/indirect costs:** Allocate via drivers (e.g., storage ops, events processed, request share) with configurable weights; fall back to per-tenant active-user share when no driver exists.
- **Edge cases:** Untagged spend auto-routed to `unattributed` bucket with weekly remediation tasks; block deployments that introduce untagged resources.

### Granularity & Sampling Strategy

- **Ingestion cadence:**
  - Cloud billing exports (bigquery/csv) every 6h; near-real-time via provider billing APIs for burst detection.
  - Metering events (requests, tasks, GPU jobs) streamed in real time to Kafka; compacted daily into parquet tables.
  - Cost deltas surfaced to dashboards within 24h; anomalies within 30m.
- **Sampling:**
  - **API/Sync traffic:** 1:50 trace sampling with tail-based upsampling for slow/error spans; all requests emit lightweight meter events.
  - **Batch/Async:** 100% job-level metering; sample per-step traces at 1:10.
  - **LLM/Third-party:** 100% call metering with token counts for unit-cost accuracy.

### Data Model & Interfaces

- **Events:** `UsageMetered` (tenant, feature, resource_type, units, latency, size_bytes), `CostAttributed` (source, amount, currency, driver, allocation_keys), `BudgetThresholdCrossed`.
- **Stores:** Raw billing bucket → cost lakehouse tables; metering Kafka topics → parquet; dimensional model for dashboards (`fact_cost`, `fact_usage`, `dim_tenant`, `dim_feature`, `dim_service`, `dim_team`).
- **APIs:** Cost guard service exposes `GET /costs?tenant&feature&window`, `GET /unit-costs`, `POST /budgets/{scope}`, `GET /anomalies`.

## 2) Performance Baselines & SLO Coupling

### KPIs by Service Type

| Service Type               | Latency (p50/p95)                         | Throughput                | Concurrency                     | Error Budget  | Cost Link                 |
| -------------------------- | ----------------------------------------- | ------------------------- | ------------------------------- | ------------- | ------------------------- |
| Public APIs (REST/GraphQL) | p50 ≤ 150ms, p95 ≤ 400ms                  | ≥ 1k rps per pod baseline | Auto-scale to maintain ≤70% CPU | 99.9% success | $/request, CPU-ms/request |
| Async workers/queues       | p95 task latency ≤ 2s                     | ≥ 500 tasks/s per shard   | Queue depth target < 1k         | 99.5% success | $/task, CPU-ms/task       |
| Data/ETL pipelines         | End-to-end SLA ≤ 15m                      | ≥ 200 MB/s per job        | Parallelism auto-tuned          | 99% success   | $/GB processed            |
| LLM/GPU jobs               | p95 job latency budgeted                  | Tokens/sec or frames/sec  | GPU utilization 65–85%          | 99% success   | $/1k tokens or $/job      |
| Storage services           | p99 read/write latency ≤ target per store | Ops/sec per volume        | IOPS headroom ≥ 30%             | 99.9% success | $/IO, $/GB-month          |

### Establishing Baselines

1. **Golden paths:** Capture traces and metrics for top 5 user journeys per service; record p50/p95 latency, CPU/RAM/GPU utilization, queue depth, cache hit ratio.
2. **Load profiles:** Run weekly synthetic load (canary + stress) to refresh baselines; store results in `performance_baseline` table with git sha and config.
3. **Performance budgets:** Define budgets per endpoint/task (`cpu_ms`, `mem_mb`, `egress_mb`, `$` target). Attach to SLO objects.
4. **Regression detection:**
   - Alert when latency/throughput deviate ≥20% from baseline or cost per unit rises ≥10% without volume change.
   - CI check: run micro-benchmarks for hot paths; compare to stored baselines (fail build on >5% regression unless waived).

### SLO ↔ Cost Trade-offs

- Every SLO includes **cost guardrails**: e.g., `p95 ≤ 400ms AND $/req ≤ $0.0004`. Scaling actions must respect budget caps (Karpenter profiles, autoscaling min/max, burst caps).
- **Degradation modes:** When budget threatened, progressively apply request shaping (rate limits), cache warming, degrade non-critical features, or shift to cheaper tiers.
- **Experimentation:** A/B experiments must log both performance and unit-cost deltas; release gates require non-regressive cost per unit.

## 3) Tooling, Reporting, and Operations

### Dashboards

- **Engineering:** Per-service live KPIs (latency, error rate, saturation), cost per request/task, cache hit rates, hot-path flame graphs, top N expensive tenants/features.
- **Finance:** Monthly/weekly spend by tenant/feature/team, forecast vs budget, reserved-usage coverage, variance explanations, FX impacts.
- **Leadership:** Trend of gross margin, top optimization wins, budget burn-down, cost-to-value ratios (cost per active tenant/feature adoption).

### Alerts & Guardrails

- **Cost anomalies:** Z-score + seasonality model on spend deltas per scope; alert when >3σ or >20% day-over-day without volume change. Auto-open Jira with suspected driver (service + resource type).
- **Runaway workloads:** Guardrail policies (OPA) block deployments with missing tags; runtime killer for outlier queries/jobs; emergency budget switch to freeze non-essential workloads.
- **Budgets/quotas:** Budgets per scope with 70/85/100% thresholds; propagate to feature flags for throttling.

### Capacity Planning & Rightsizing

- Weekly capacity review: compare observed p95 utilization vs requested resources; generate rightsizing recommendations (CPU/mem, storage tiering, node class changes).
- Forecast demand using usage growth + seasonality; plan purchase of commitments (RIs/Savings Plans/GPU reservations) with break-even analysis per tenant cluster.
- Maintain headroom policies: ≥30% for latency-sensitive, ≥15% for batch; validate via synthetic load tests.

### Data Flow & Tooling Stack

- **Ingestion:** Provider billing export → BigQuery/Snowflake; Kafka topics for metering; OpenTelemetry for traces/metrics; Prometheus for runtime metrics; Kubecost/CloudHealth for cross-check.
- **Processing:** dbt/SQL models to produce unit-cost tables; anomaly detection via Python jobs (prophet/z-score) in Airflow/Argo; rightsizing via kube-state-metrics + Goldilocks-style analysis.
- **Surfacing:** Grafana/Looker dashboards; cost-guard API for product/feature teams; Slack/Jira/Email for alerts; feature-flag hooks for auto-throttle.

## 4) Artifacts

### CompanyOS FinOps Model v0 Outline

1. Scope & objectives
2. Taxonomy (tenant, feature, service, team, environment)
3. Tagging & metering standards (required labels/trace attrs)
4. Data pipeline (ingestion → normalization → allocation → surfacing)
5. Cost drivers & unit economics
6. Performance baselines & budgets
7. Governance (budgets, alerts, waivers, change control)
8. Review cadence & ownership (FinOps, SRE, Finance)

### Example Cost Attribution

- **Tenant Alpha (Production, Q1):**
  - Compute: $12,400 (55%) — 420k CPU-hours, 9 GPU-hours.
  - Storage: $4,200 (19%) — 120 TB-month hot, 300 TB-month cold, snapshots x1.5.
  - Network: $2,100 (9%) — 18 TB egress, 6 TB cross-AZ.
  - Third-party: $4,900 (22%) — LLM calls (62M tokens), auth seats, observability.
  - Shared overhead: $900 (4%) allocated by request share.
- **Feature “AI Search”:** (cross-tenant, last 30d)
  - Unit cost: $0.00055/query (down from $0.00062 after cache tuning).
  - Cost composition: 60% LLM, 25% compute, 10% storage, 5% network.
  - Performance: p95 380ms at 1.2k rps/pod; GPU utilization 78% for rerank jobs.

### Checklist — “Feature is cost-aware and monitored if…”

- [ ] All resources tagged with tenant, feature, team, env; traces include `tenant_id`, `feature`, `service`, `cost_unit`.
- [ ] Metering events emitted for requests/jobs with unit metrics (cpu_ms, mem_mb, tokens, bytes, duration_ms).
- [ ] SLOs define latency + success + **unit-cost budget**; dashboards include $/unit alongside latency.
- [ ] Budgets set with 70/85/100% alerts; anomalies routed to Slack/Jira with owner.
- [ ] Load/perf tests produce baselines stored with git sha; CI blocks on >5% perf regression or >10% unit-cost increase.
- [ ] Rightsizing recommendations reviewed weekly; caches/tiers chosen to meet budget.
- [ ] Runbooks exist for cost spikes and degradation modes; feature flags can throttle expensive paths.
- [ ] Third-party usage (LLM, SaaS) metered with token/seat counts; rate limits enforced.

### Forward-Leaning Enhancements

- **Predictive guardrails:** Train per-tenant cost forecasting models that emit early-warning budgets to feature flags, enabling preemptive autoscaling/traffic-shaping before budget breaches.
- **Adaptive unit-cost optimizer:** Use reinforcement signals from historical traces to auto-tune cache TTLs, batch sizes, and model choices (LLM tiering) to minimize $/unit while respecting SLOs.
