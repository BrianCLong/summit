# CompanyOS Sprint Plan — “Reliability Rails: SLOs, Probes, Rollbacks, Cost” (Sprint 29)

**Theme:** Make the platform self-defending: detect issues first, limit blast radius, roll back automatically, and keep costs sane.

## Sprint Window

- **Start:** Mon Feb 16, 2026
- **End:** Fri Feb 27, 2026
- **Cadence:** 2 weeks

## Sprint Goal

**A bad deploy cannot silently hurt customers.** We can prove that with SLO dashboards, synthetic probes, canary gates, and automated rollback evidence.

## Epics (Committed)

### Epic A — Service SLO Kits (Error Budgets that Gate Releases)

**Stories**

- Define SLOs for the top 2 customer-facing services: availability, latency (p95), and a “correctness” proxy (e.g., successful export completion rate).
- Create golden dashboards and alert rules for each service.
- Add a release gate: block promotion when error budget burn rate exceeds threshold.

**Acceptance**

- SLO dashboard exists and is linked from runbooks.
- Release pipeline reads SLO state and can block promotion with a clear message.

**Evidence**

- `.evidence/sprint-29/slo/` (SLO definitions, dashboard JSON, gate output).

### Epic B — Synthetic Probes + “Customer Journeys”

**Stories**

- Add 3 probes that run continuously (or on schedule):
  1. Auth + basic query.
  2. Investigation graph/timeline fetch (lightweight).
  3. Export create → pack ready (staging at minimum).
- Probes emit trace IDs, logs, and audit events where applicable.

**Acceptance**

- Probe failures page or alert with enough context to diagnose in <10 minutes.
- Probe runs are visible on dashboards (success rate and latency).

**Evidence**

- `.evidence/sprint-29/probes/` (probe definitions and sample outputs).

### Epic C — Canary Guardrails v2 (Automated Rollback You Can Trust)

**Stories**

- Canary promotion rules tied to probe success, error rate deltas, and latency regression thresholds.
- Implement rollback reason codes and attach an evidence bundle to rollback events.
- Run one staged “failure drill” to validate rollback triggers.

**Acceptance**

- A canary regression triggers rollback automatically in staging.
- Rollback produces an auditable artifact (what triggered, when, metrics snapshot).

**Evidence**

- `.evidence/sprint-29/canary/` (rules, drill report, rollback artifact).

### Epic D — Cost & Performance Budgeting (No Surprise Bills)

**Stories**

- Add cost telemetry (even coarse): request volume, queue depth, storage growth, top endpoints by latency.
- Establish budgets: max queue depth, max export runtime, and max storage growth per tenant per day (alert-only initially).
- Deliver one performance win by profiling and optimizing the hottest path surfaced by probes/SLOs.

**Acceptance**

- Budget alerts fire in staging when thresholds are exceeded.
- One measured improvement (before/after numbers) on a hot path.

**Evidence**

- `.evidence/sprint-29/cost-perf/` (budgets, metric snapshots, perf report).

## Stretch (If Capacity)

- Chaos-lite: kill one dependency in staging and verify graceful degradation and alerts.
- Add “runbook generator” template section for new services (SLO + probes + rollback).

## Non-Goals

- New product features.
- Big refactors unrelated to SLOs, probes, canaries, or cost.
- Perfect cost attribution (we will iterate).

## Sprint Exit Gates (Hard)

- ✅ 2 services have SLOs, dashboards, and alert rules.
- ✅ 3 synthetic probes live with trace/audit correlation.
- ✅ Canary promotion/rollback tied to real signals plus one drill completed.
- ✅ At least one measurable performance or cost improvement shipped.
