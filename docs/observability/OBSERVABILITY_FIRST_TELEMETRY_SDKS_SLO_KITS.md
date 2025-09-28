# Observability First — Telemetry SDKs & SLO Kits

## Mission

Deliver a one-line installation experience that enables any Summit service to emit metrics, logs, and traces with curated dashboards and actionable SLO alerting ready out of the box.

## Vision & Success Criteria

- **Developer experience:** Instrumentation is enabled with a single dependency and one-line bootstrap call per language, requiring no bespoke configuration for core telemetry.
- **Operational outcomes:** Platform teams receive latency, error, traffic, and saturation (LETS) visibility on day one, with burn-rate alerting and drill-down dashboards that prove end-to-end traceability across API → worker → data layers.
- **Reliability guardrails:** Telemetry overhead stays within agreed SLOs, sensitive data is redacted, and alert noise is controlled via multi-window policies.

## Scope (MVP, 6 Weeks)

1. **Language SDKs (Go, TypeScript/Node, Python)**
   - Wrap OpenTelemetry auto + manual instrumentation with sane defaults for sampling, context propagation, semantic conventions, and baggage.
   - Offer helpers for standard metric names (RED + USE), trace attributes, and structured logging formatters.
   - Provide plug-and-play exporters: OTLP/gRPC for traces & metrics, stdout JSON for logs, and Prometheus scrape endpoints where applicable.
2. **Golden Dashboards & SLO Kits**
   - Grafana dashboard JSON for service, API, worker, and database personas.
   - Four golden dashboards per service: `Overview`, `Availability`, `Performance`, `Saturation`.
   - Alert rules covering latency, error rate, and saturation using multi-window/multi-burn-rate strategies.
3. **Synthetic Example Services & Runbooks**
   - Reference `api → worker → db` demo app instrumented with the SDKs.
   - Synthetic load generator to validate SLO alerting and traces.
   - Runbooks documenting alert response steps and play demo script.

## Definition of Ready (DoR)

- Metric catalogue drafted and reviewed with SRE & Product Ops, covering RED + USE metrics and logging schema.
- Exemplar sample services identified with owners who will integrate the SDK during MVP.
- Alert delivery channels (PagerDuty, Slack, email) validated and integrated with Grafana/Alertmanager.
- Security review kickoff logged; PII redaction strategy approved.

## Definition of Done (DoD)

- Reference service demonstrates trace continuity across API → worker → database with exemplar spans in tracing UI.
- SLO alerts fire in staging under synthetic load, with alert drill logs captured.
- Dashboards imported into staging Grafana instance, reviewed by SRE.
- SDK packages published (internal registry) with getting-started guides and migration checklist.
- Evidence bundle (screenshots, runbooks, alert logs, SLO docs) stored in shared repo.

## Deliverables

- `sdk/go`, `sdk/node`, and `sdk/python` packages providing bootstrap APIs, middleware, and exporters.
- Dashboard JSON exports (Grafana 9+ compatible) committed under `docs/observability/dashboards/`.
- Alert policies in YAML aligned with Alertmanager schema and PagerDuty routing.
- Runbooks for each alert, including diagnostic commands and rollback guidance.
- Demo playbook + recording showcasing cross-service trace walkthrough and alert drill.

### Delivered Artifacts (MVP Kickoff)

| Artifact | Location | Notes |
| -------- | -------- | ----- |
| Metrics catalogue | [`docs/observability/metrics_catalogue.yaml`](metrics_catalogue.yaml) | Canonical list of metrics, owners, dimensions, retention, and alert bindings. |
| Grafana dashboards | [`docs/observability/dashboards/`](dashboards) | JSON exports for the four golden dashboards (Overview, Availability & Reliability, Performance & Latency, Infrastructure & Saturation). |
| Alert policies | [`docs/observability/alerts/observability-first-alerts.yaml`](alerts/observability-first-alerts.yaml) | Alertmanager routing with PagerDuty, Slack, and synthetic drill receivers. |
| Incident runbooks | [`docs/observability/runbooks/`](runbooks) | Markdown runbooks aligned to latency, error budget, and saturation alerts. |
| SLO documentation template | [`docs/observability/slo/sample-service-slo.md`](slo/sample-service-slo.md) | Template for teams to document objectives, SLIs, dependencies, and review cadence. |

## Interfaces & Integration Contracts

- Telemetry exported over OTLP (gRPC/HTTP) to the central collector (default endpoint configurable via env vars).
- Structured JSON logs emitted to stdout with trace/span correlation IDs and PII redaction middleware applied.
- Metrics exposed via OTLP and optional Prometheus scrape endpoint (`/metrics`) for services not yet OTLP-native.
- Configuration managed via shared `telemetry.yaml` supporting sampling (head, tail, span attribute-based) and redaction rules.

## SDK Implementation Blueprint

### Common Components

- `TelemetryConfig` struct/schema with defaults, validated at startup.
- `Resource` attributes auto-populated (service.name, version, environment, deployment.region).
- `GlobalPropagators` configured for W3C TraceContext + Baggage; allow optional `b3` toggle.
- Sampling defaults: 5% traces in prod with rate-limiting fallback; 100% in dev/test.
- Sensitive attribute filter list maintained centrally; applied before export.

### Go SDK

- Provide `telemetry.Init(ctx, options...)` returning shutdown func.
- HTTP middleware for `net/http`, gRPC interceptors, and SQL instrumentation wrappers.
- Prometheus exporter using `prometheus-remote-write` for metrics when required.

### TypeScript/Node SDK

- `initTelemetry({ serviceName, env })` with Express/Koa middleware, NestJS interceptor helpers.
- Winston/Pino transport wrapper for structured logs + trace correlation.
- Support for worker contexts (BullMQ, Temporal) to propagate traces through job queues.

### Python SDK

- `init_telemetry(app, config)` supporting FastAPI, Django, Celery instrumentation.
- Standard logging formatter hooking into `logging` module with JSON output.
- Async context utilities to preserve trace context across asyncio tasks.

## Metrics Catalogue (Excerpt)

| Domain   | Metric                            | Type      | Description                | Default Labels                       |
| -------- | --------------------------------- | --------- | -------------------------- | ------------------------------------ |
| API      | `request_latency_ms`              | Histogram | End-to-end API latency     | `service`, `route`, `status`         |
| API      | `request_error_rate`              | Counter   | Count of non-2xx responses | `service`, `route`, `status`         |
| Worker   | `job_processing_time_ms`          | Histogram | Worker job execution time  | `service`, `queue`, `result`         |
| Worker   | `job_failures_total`              | Counter   | Failed jobs                | `service`, `queue`, `error_type`     |
| Database | `db_query_time_ms`                | Histogram | Query latency              | `service`, `db.cluster`, `operation` |
| Platform | `telemetry_export_failures_total` | Counter   | Exporter failures          | `service`, `exporter`, `reason`      |
| Platform | `log_drop_ratio`                  | Gauge     | Dropped logs vs produced   | `service`, `pipeline`, `environment` |

Full catalogue to be maintained under `docs/observability/metrics_catalogue.yaml` (MVP deliverable).

## Golden Dashboard Package

1. **Service Overview** – high-level SLI KPIs, error budgets, request volumes.
2. **Availability & Reliability** – burn rate panels, alert status, saturation indicators.
3. **Performance & Latency** – p50/p95/p99 latency histograms, queue times, dependencies.
4. **Infrastructure & Saturation** – CPU/memory, queue depth, database saturation.

Dashboards leverage exemplars to jump into traces, linking to service dependency maps (Track B).

## SLO & Alerting Strategy

- **Latency SLO:** 99th percentile API latency < 750 ms (7-day window). Alerts fire at 2× burn for 1 hr and 4× burn for 6 hrs.
- **Error Rate SLO:** Request error budget of 0.1% (30-day window) with multi-burn alerts.
- **Saturation SLO:** Worker queue depth < 500 jobs or < 5 min delay; CPU < 75% sustained.
- Alerts routed via Alertmanager → PagerDuty (sev2) and Slack (#observability-alarms).
- Alert runbooks define triage steps, graphs to inspect, rollback/escalation path.

## Security & Compliance Controls

- PII redaction library integrated with allow/deny lists; default denies include emails, phone numbers, SSNs.
- Sampling rules for sensitive spans (auth, billing) default to 1% with attribute scrubbing.
- Encryption in transit for OTLP (mTLS); certificates rotated via platform secrets manager.
- Logs vetted against data retention policy; provide retention runbook.

## Performance Targets (SLOs)

- Tracing overhead < 5% CPU/memory for instrumented services (validated via benchmarks).
- Log drop rate < 0.1% measured at collector vs emitter.
- Four golden dashboards per service maintained; checks automated in CI to ensure JSON exports present.

## Execution Timeline (6 Weeks)

| Week | Focus                    | Milestones |
| ---- | ------------------------ | ---------- |
| 1    | Planning & Foundations   | Metric catalogue review; security sign-off; baseline dashboards skeleton; synthetic probe plan. |
| 2    | Go SDK                   | Init, middleware, exporters functional; sample Go service instrumented. |
| 3    | Node & Python SDKs       | Express/FastAPI integrations; structured logging; initial docs. |
| 4    | Dashboards & Alerts      | Grafana JSON drafts; alert policies authored; runbook outlines. |
| 5    | Integration & Validation | Demo service full trace path; synthetic load tests; alert drills recorded. |
| 6    | Polish & Launch          | Package publishing; final documentation; evidence bundle; demo dry run. |
## Team & Stakeholders

- **Engineering Lead:** Coordinates SDK development, ensures release quality.
- **SRE Lead:** Owns dashboards, alert tuning, and SLO validation.
- **Security Liaison:** Reviews redaction & sampling controls.
- **Product Ops:** Tracks DoR/DoD artifacts and evidence.
- **Developer Advocates:** Prepare onboarding docs and internal workshops.

## Dependencies & Tooling

- OpenTelemetry Collector deployment with OTLP + Prometheus receivers.
- Grafana & Alertmanager instances with service accounts and API keys.
- CI integration for linting SDKs, testing instrumentation, and validating dashboard JSON schema.
- Synthetic load tooling (k6, Locust) configured for demo service.

## Evidence & Reporting Plan

- Weekly status includes ADR link, dashboard screenshots, release notes, and policy diffs.
- Screenshot pack stored under `docs/observability/evidence/` with trace, dashboard, and alert examples.
- Alert fire/drill logs exported from PagerDuty and linked in runbooks.
- SLO documentation per service committed under `docs/observability/slo/` including objectives, SLIs, and remediation steps.

## Risk Register & Mitigations

- **Cost blowup:** Enforce sampling & cardinality guardrails (auto drop high-cardinality attributes, metrics budgets).
- **Noisy alerts:** Use multi-window burn rates, require ack/comment for rerouting; schedule weekly tuning review.
- **Integration friction:** Provide migration checklist, office hours, and quickstart templates.
- **SDK drift:** Establish ownership rotation and CI contract tests against collector.

## Track B (Post-MVP Explorations)

- Expand auto-instrumentation coverage (profiling, database ORM hooks, messaging systems).
- Generate service dependency maps from trace topology; integrate with architecture diagrams.
- Evaluate anomaly detection for telemetry streams and adaptive sampling.

## Kickoff Checklist (Every Team)

1. Confirm DoR artifacts are created, reviewed, and linked in project tracker.
2. Open an ADR PR and tag Security, SRE, and Product Ops for alignment.
3. Import baseline dashboards and SLOs into environment on day 1; verify data sources.
4. Stand up synthetic probes before the first deploy; record probe coverage.
5. Ensure merge readiness by validating CI + observability health checks; block release until green.
6. Attach evidence to weekly status: ADR link, dashboard screenshots, release notes, policy diff, alert drill summary.
