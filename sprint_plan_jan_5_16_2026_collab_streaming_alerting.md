# Sprint 16 — "Collab, Alerts, Streaming" (Jan 5–16, 2026)

## Executive Summary
This sprint delivers real-time collaboration primitives, a streaming ingest lane with provenance, rules + anomaly alerting, and casework/playbook foundations. The plan emphasizes resilient ingest (Kafka → ETL → Neo4j cache), sub-150ms presence UX, auditable alert triage, and exportable cases. Guardrails cover performance, cost, and feature-flagged kill switches.

## Goals (reaffirmed)
- **Real-time collaboration MVP:** live presence, shared selections, comments/mentions, and pinned tri-pane views.
- **Streaming ingest lane:** Kafka consumer emits idempotent mutation intents; ETL operators capture provenance; bounded Neo4j upserts nudge caches.
- **Alerting pipeline:** declarative rule engine plus anomaly scoring; inbox with triage lifecycle.
- **Playbooks/casework MVP:** case object with evidence/tasks; export-to-manifest with immutability hash.
- **Hardening:** extend perf guardrails to streaming and collab paths; dashboards and kill switches.

## Architecture Snapshot
- **Collaboration:** Socket.IO (presence, selections, cursors) riding existing GraphQL auth context; persisted comments/mentions anchored to nodes/edges/paths; pinned tri-pane `ViewState` serialized with shareable URLs honoring RBAC/ABAC.
- **Streaming ingest:** Kafka topics → Node consumer → canonical mutation intents → ETL operator pipeline (PII tagger, license attach, lineage hop) with per-operator auditing → Neo4j batched upserts (deterministic keys, at-least-once semantics) → neighborhood cache invalidation hooks.
- **Alerting:** Rule engine (JSON DSL) evaluates events/graph patterns with warm caches; anomaly service (Python/FastAPI + Isolation Forest) scores rolling feature vectors; alert records carry status, assignee, reason, evidence links.
- **Casework/playbooks:** Case object `{title,tags,participants,linkedViews,evidenceIds,tasks[]}` with checklist tasks (assignee, due, done history); export bundles manifest.json (sources/transforms/licenses/approvals) with stored hash for immutability.
- **Ops & cost guard:** OTEL spans + Prom metrics on collab + streaming lanes; feature flags for collab/anomaly; rate-limit/digest rules; Grafana dashboards for p95s and error rates.

## Scope → Stories (DoD reminders)
- **A1 Presence & Cursors:** broadcast `{userId,pane,selection[],timestamp}`; p95 ≤150ms; disconnect cleanup; multi-user overlay verified in two-browser demo.
- **A2 Shared Comments & Mentions:** CRUD with audit; `@mention` sends in-app toast + email stub; anchors support nodes/edges/paths.
- **A3 Pinned Views:** persist tri-pane `ViewState` (filters, time brush, layout seed); shareable URL; RBAC/ABAC respected.
- **B1 Kafka Consumer:** backpressure aware; idempotent upserts; at-least-once.
- **B2 Stream-safe ETL Operators:** record applied operators; DLQ on failure with reason.
- **B3 Neo4j Upsert + Cache Nudge:** bounded batches; cache invalidation; 10k events/min without dupes or stalls.
- **C1 Rule Engine:** rule CRUD + dry-run; p95 eval ≤200ms with warm cache.
- **C2 Anomaly Scoring:** rolling stats + Isolation Forest baseline; AUC ≥0.85 on fixture; model/version logged; thresholds configurable.
- **C3 Alert Inbox & Triage:** statuses new/triaged/closed; assignee; audit; filters by status/owner/time.
- **D1 Case Object:** create from selection; attach evidence chips; RBAC/ABAC enforced.
- **D2 Tasks & Checklists:** assignees, due dates, completion history; SLA metrics visible; audited.
- **D3 Export-to-Manifest:** validates against schema; hash stored.
- **E1 OTEL/Prom:** spans, cache hit/miss, per-rule eval; Grafana p95/error dashboards.
- **E2 Feature Flags/Cost Guard:** runtime toggles for collab/anomaly; alert volume caps; safe degradation proven.

## Interface Notes
- **GraphQL additions:** Comment/Alert/Case/Task types with queries/mutations for comments, alerts (with filters), cases, addComment, upsertRule, acknowledgeAlert, createCase, addTask, setTaskDone.
- **Kafka consumer:** deterministic node/edge keys; sanitized props; bounded batch transactions; retries with dead-letter on poison messages.
- **Anomaly FastAPI:** `/score` endpoint accepts feature vectors `{degree,delta_edges_24h,betweenness_pct,time_since_seen_min}` and returns model scores; model metadata logged.
- **Frontend hooks:** Socket.IO presence ping every 3s; comment post extracts `@mention` tokens; shareable pinned view URLs.

## Engineering Plan
- **Collab lane:**
  - Implement presence channel with heartbeat/timeout; overlay cursors; reconcile stale sessions on disconnect.
  - Comment service with per-anchor lock to avoid races; mention notifications via toast + email stub; audit log entry per CRUD.
  - ViewState serializer/deserializer with RBAC filter; share URL generator; cache recent pins.
- **Streaming lane:**
  - Kafka consumer with backpressure and at-least-once; mutation intent schema and sanitization.
  - ETL operator registry (PII tagger, license attach, lineage hop) with operator audit chain and DLQ.
  - Neo4j upsert using deterministic keys; bounded batch size adaptive to lag; cache invalidation hook; metrics on latency/error.
- **Alerting lane:**
  - Rule engine with JSON DSL evaluation and dry-run; warm caches for graph lookups; per-rule p95 metric.
  - Anomaly service packaging Isolation Forest with model/version logging; threshold config; rolling stats features.
  - Alert inbox UI/API with status transitions, assignee, evidence links; audit trail; filters.
- **Casework:**
  - Case creation from selection; evidence chips; participant roles; task checklist with SLA timers; export to manifest.json + hash stored.
- **Ops/guardrails:**
  - OTEL spans for collab + streaming; Prom metrics (cache hit/miss, eval time, Kafka lag, DLQ size); Grafana dashboards.
  - Feature flags (collab/anomaly) and budget caps for alerts; graceful degradation paths.

## Acceptance & Demo Flow
1. Two-browser collab demo: live cursors + selections + comments with mention ping.
2. Kafka burst (10k events) processed with lineage + cache invalidation; UI shows fresh edges.
3. Alerts demo: rule + anomaly enabled → inbox items with evidence; triage to “closed” with audit trail.
4. Casework demo: create case from selection, add tasks, attach evidence, export bundle with manifest hash.

## Risks & Mitigations
- Race conditions (collab/streaming): optimistic UI + server reconcile; deterministic ids; per-anchor locks; DLQ for poison messages.
- Alert noise: per-rule rate limits; anomaly thresholds; digesting; feature flags as kill switch.
- Throughput spikes: adaptive batch/backoff; cache TTL + invalidation; DLQ monitoring.
- Perf regressions: p95 dashboards; synthetic load tests; circuit breakers on anomaly/alert flows.

## Metrics & Guardrails
- Presence p95 ≤150ms; Kafka ingest sustain 10k/min with <1% DLQ; rule eval p95 ≤200ms; anomaly AUC ≥0.85; ≥60% alerts linked to cases within 24h.
- Cost guard: alert volume budget caps; anomaly compute watchdog; Grafana costs + usage dashboards.

## Day-by-Day Swimlanes (10 biz days)
- **Day 1–2:** finalize schemas; stand up Kafka topics (dev/stage), FastAPI anomaly scaffold; collab presence channel skeleton; OTEL/Prom wiring.
- **Day 3–4:** mutation intent schema + ETL operator registry; comment/mention CRUD with audit; rule engine dry-run path; initial dashboards.
- **Day 5–6:** Neo4j batch upsert + cache invalidation; anomaly model baseline + fixtures; pinned view serialization + shareable URL; inbox filtering.
- **Day 7–8:** DLQ + retries; SLA metrics for tasks; export-to-manifest hashing; feature flags toggles; perf guardrails pass.
- **Day 9–10:** Full E2E demos; load test 10k/min; alert precision eval; doc + runbooks; release candidate cut.

## Dependencies / Open Questions
1. **Kafka availability:** If no cluster, ship docker-compose for dev and Helm chart for stage.
2. **Anomaly features priority:** Start with temporal spikes + degree deltas + betweenness pct + time-since-seen; expand if needed.
3. **Mentions notifications:** In-app toasts required now; email/webhook stub only this sprint unless expanded.

## Testing & Quality Gates
- Jest/Playwright suites for collab/comment/pinned views; integration for rule engine + anomaly API; load test profile for 10k/min ingest; contract tests for Kafka mutation intents and manifest schema; axe-core on comments UI; coverage ≥80% for touched code; perf profiles for p95 targets.

## Ops & Runbooks
- Deployment manifests for Kafka consumer (Node), anomaly service (FastAPI), and dashboards; feature-flag toggles documented; incident runbook for DLQ growth or alert floods; rollback includes disabling flags and draining Kafka consumer with checkpoint.

## Innovation Track (forward-leaning)
- Explore CRDT-based shared annotations for conflict-free comment edits; streaming snapshot isolation using read replicas for cache-friendly queries; optional WebTransport upgrade for lower-latency presence; autoscaling anomaly workers via adaptive throughput forecasting.

