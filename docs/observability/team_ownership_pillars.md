# Observability Pillars & Dashboard Ownership

## The Pillars of Observability
To ensure the reliability, performance, and efficiency of our platform, our observability strategy is built on four core pillars:

1. **Metrics (Quantitative Data):**
   - Tracking system state, resource utilization, business KPIs, and CI throughput over time.
   - Handled via Prometheus/Grafana (`server/src/monitoring/metrics.ts`).
2. **Logs (Event Records):**
   - Capturing structured payload events, exceptions, and discrete system activities for debugging and root cause analysis.
   - Standardized via Pino and structured logging payloads.
3. **Traces (Execution Paths):**
   - Distributed tracking of requests across services to analyze latency bottlenecks and system boundaries.
   - Powered by OpenTelemetry (`server/src/services/orchestration/telemetry.ts`).
4. **Dashboards & Alerts (Actionable Insights):**
   - Visualizing the state of our pillars into human-readable contexts and triggering automated runbooks when SLIs fail.

## Team Dashboard Ownership Matrix

| Dashboard / Domain | Primary Owner | Secondary Owner | Key Metrics | Runbooks |
| --- | --- | --- | --- | --- |
| **CI & Platform Health** | **Developer Experience (DX)** | Platform Engineering | `ci_runtime_minutes`, `ci_test_flakes_total`, `merge_queue_prs_merged_total` | `docs/runbooks/ci-runtime-degradation-runbook.md` |
| **Orchestrator & Agents** | **Maestro Team** | Core Backend | `orchestrator_tasks_total`, `maestro_job_execution_duration` | `docs/runbooks/linear-governance-runbook.md` |
| **Database & Persistence** | **Infrastructure Data** | Platform Engineering | `summit_database_query_duration`, connection counts | `docs/runbooks/database-backup-runbook.md` |
| **API & Gateway Layer** | **Core Backend** | Frontend | `summit_http_request_duration`, error rates (4xx, 5xx) | N/A |

### Responsibilities of Owners
- **Maintenance:** Ensure the dashboard JSON remains up-to-date and tracks accurately to the underlying PromQL.
- **Alert Tuning:** Review alert thresholds monthly to ensure they are actionable and not flaky.
- **Runbooks:** Keep associated markdown runbooks in `docs/runbooks/` current to aid on-call responders.
