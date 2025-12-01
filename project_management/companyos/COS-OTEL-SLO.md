# COS-OTEL-SLO — OTEL Telemetry + SLO Dashboards

## Goal
Deliver end-to-end OpenTelemetry-based traces, metrics, and logs enriched with `{service, tenant, env, purpose}` attributes, along with curated SLO dashboards and alerts for latency, error budgets, and unit cost.

## Key Outcomes
- Unified instrumentation library exporting OTLP data with tenant/purpose attributes.
- Grafana dashboards for p95/p99 latency, error budget burn, and unit cost by tenant.
- Multi-window, multi-burn-rate alerts firing on latency breaches, error rates >2%, and 80% budget consumption.
- Runbooks and observability handbook updates enabling on-call to triage quickly.

## Architecture Overview
| Component | Responsibility |
| --- | --- |
| Instrumented Services | Emit traces, metrics, and logs with enriched attributes.
| OTEL Collector | Receives OTLP data, batches/export to backend (e.g., Tempo, Prometheus, Loki).
| Observability Backend | Stores traces, metrics, logs; feeds Grafana dashboards.
| SLO Config Repo | Houses SLO definitions (YAML/Terraform) tracked in Git.
| Alert Routing | Integrates with PagerDuty/Slack for incident notification.

### Data Flow
1. Service instrumentation captures request context and attaches `{tenant, purpose}` attributes.
2. OTEL Collector batches data, applies tail sampling for high-cardinality traces, and exports to backend.
3. SLO definitions compiled into backend (Prometheus + Cortex) to compute burn rates and error budgets.
4. Grafana dashboards visualize per-tenant metrics; alerts trigger via Alertmanager with burn-rate logic.

## Implementation Plan
### Phase 0 — Discovery (Week 1)
- Audit existing instrumentation coverage; identify gaps per service.
- Align on SLO targets with Product, App Eng, and Finance (latency, error, cost).

### Phase 1 — Instrumentation Upgrades (Weeks 1-2)
- Update shared OTEL library to include tenant/purpose attributes; propagate trace IDs into logs.
- Configure collectors for high-availability deployment, batching, and retries.
- Add unit tests ensuring attribute propagation and log correlation.

### Phase 2 — SLO Definition & Infrastructure (Week 2)
- Author SLO YAML/Terraform modules capturing latency, error rate, and cost metrics.
- Deploy SLO dashboards and alert rules to staging; validate calculations with sample data.
- Implement burn-rate alerting (1h/6h windows) with 80% budget threshold notifications.

### Phase 3 — Synthetic Validation & Runbooks (Week 3)
- Build synthetic load jobs that drive metrics near thresholds to test alert behavior.
- Document runbooks covering alert interpretation, mitigations, and escalation.
- Conduct on-call training session reviewing dashboards and alerts.

## Work Breakdown Structure
| Task | Owner | Duration | Dependencies |
| --- | --- | --- | --- |
| Instrumentation audit | SRE + App Eng | 2d | None |
| Library attribute enhancements | App Eng | 3d | Audit |
| Collector configuration | SRE | 2d | Library enhancements |
| SLO YAML authoring | SRE | 3d | Targets aligned |
| Dashboard creation | SRE | 3d | SLO YAML |
| Alert routing integration | SRE | 2d | Dashboard creation |
| Synthetic load + runbooks | SRE + App Eng | 3d | Alerts configured |

## Testing Strategy
- **Unit**: Attribute propagation tests, log correlation tests, metric export verification.
- **Integration**: Collector pipeline tests ensuring telemetry continuity during restart/failure.
- **Synthetic**: Load tests hitting thresholds to validate alert firing and auto-resolve behavior.
- **Chaos**: Drop collector pod to confirm failover and data continuity.

## Observability & Operations
- Metrics: `otel_exporter_queue_length`, `otel_span_dropped_total`, `slo_error_budget_remaining`, `slo_burn_rate`.
- Dashboards: Global + per-tenant panels for latency, error rate, cost overlays.
- Alerts: p95 latency breach, error rate >2%, 80% budget consumed in 6h window.

## Security & Compliance
- Ensure telemetry pipelines encrypted in transit (mTLS between services and collector).
- Apply tenant data access controls to dashboards (folder permissions, multi-tenant safe variables).

## Documentation & Enablement
- Update observability handbook with instrumentation guidelines and attribute taxonomy.
- Record video walkthrough of dashboards and alert triage.
- Provide cheat sheet for on-call to quickly identify tenant-specific issues.

## Operational Readiness Checklist
- [ ] Synthetic load triggers each alert and demonstrates proper routing.
- [ ] Dashboards reviewed and signed off by Product, SRE, and Finance.
- [ ] Runbooks linked within alert annotations.
- [ ] Observability configs stored in Git with peer review completed.

## Dependencies
- None (runs independently but consumes outputs from telemetry stack).

## Risks & Mitigations
- **Noisy alerts**: Use multi-window burn rates and staged rollout to tune thresholds.
- **High cardinality**: Apply attribute cardinality controls and sampling strategies.

## Acceptance Criteria
- Synthetic load triggers latency, error, and burn-rate alerts with correct routing.
- Per-tenant dashboards render accurately with templated variables.
- Dashboards include unit cost overlays derived from telemetry exporters.
- Alert runbooks validated with on-call sign-off.
