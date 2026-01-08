# 90-Day War Plan (Three Phases)

## Overview

- **North Star Metric:** Secure monthly active investigative workspaces completing an end-to-end graph investigation with verified insights.
- **Guardrails:**
  - Reliability: Tier 0/1 services maintain \>= 99.9% availability with \<= 15 min MTTR.
  - Cost: Cloud spend per active workspace \<= baseline with \<= 5% weekly variance; telemetry/storage capped per budgets.
  - Security: Zero criticals; all privileged actions audited; SSO/MFA enforced for admins.
- **Constraints:**
  - Error budget: 43.2 min downtime per 30-day window; burn alerts at 25/50/75%.
  - Cost budget: Weekly cap by service with alerts at 70/85/100% and auto-throttle for bursty tenants.
  - Surface area freeze: one-in/one-out for any new endpoint, flag, or queue.
- **Non-Negotiables:** Owners per domain; SLOs with CI gates; mandatory deprecation windows; audit logs for privileged/admin actions; rollback plans and docs for every deployment.
- **Cadence:** Weekly exec review (scoreboard, risks, decisions), live risk register (top 10 with ship dates), monthly reliability+cost report, and always ship 1 deletion + 1 prevention + 1 customer-visible improvement each week.
- **Acceptance Template:** Define success metrics, rollout plan with auto-rollback, docs/runbooks, support training, and observability (SLOs + burn alerts + traces/logs).

## Phase 1 (Days 1–30): Control, Visibility, and Guardrails

- Instrument 5 revenue-critical journeys with SLO dashboards, burn alerts, and runbooks; run a GameDay to validate roles, comms, rollback.
- Implement progressive delivery with auto-rollback for Tier 0/1 services; standardize correlation IDs, structured logs, and trace propagation.
- Enforce SSO/MFA; remove shared accounts; stand up admin console skeleton with audit logging and repair hooks.
- Build cost attribution by service with budgets and alerts; create the “deletion list” and retire 5 dead flags/endpoints; kill top 10 noisy alerts.
- Freeze new surface area unless it replaces something; create single backlog with stop-doing list and name single-threaded owners per domain/epic.
- Publish the charter internally as the operating constitution; start KPI scoreboard + weekly narrative template.

### Success Metrics by Day 30

- 5 critical journeys with SLOs + burn alerts and successful GameDay run.
- Auto-rollback live for Tier 0/1; SSO/MFA coverage at 100%; admin audit logging shipped.
- Cost dashboards per service with alerting; 5 deletions completed; top 10 noisy alerts removed.
- Exec weekly cadence live; risk register populated with top 10 items and deadlines.

## Phase 2 (Days 31–60): Deletion, Consolidation, Correctness

- Merge duplicate user flows into canonical paths; deprecate/remove 5 low-usage high-maintenance features.
- Consolidate internal tooling into admin console; standardize on one queue/scheduler; remove cross-domain DB reads in favor of domain APIs.
- Delete redundant dashboards/telemetry streams; reduce telemetry cardinality/retention; remove unused deps and upgrade pinned critical libs.
- Establish migration factory scaffolding (backfill, verify, cutover switches) and enforce transactional outbox where needed.
- Declare system-of-record per domain; eliminate at least one dual-write path; add DB constraints and state machine invariants for riskiest domain.
- Add idempotency keys to retried writes (billing/provisioning first); implement reconciliation jobs + exception queues for critical entities.

### Success Metrics by Day 60

- 2 services collapsed or consolidated; canonicalized user flows live; 5 features and 5 telemetry/dashboards deleted.
- One queue/scheduler path in production; cross-domain DB reads removed for top domains; migration factory used in at least one cutover.
- Dual-write path removed; constraints/invariants enforced; reconciliation with exception queue running; idempotency keys deployed for all retried writes.
- Telemetry cost down and dependency footprint reduced; updated runbooks and deprecation notices published.

## Phase 3 (Days 61–90): Performance, Cost, Trust, Monetization

- Fix top 20 queries by cost (time × freq) with regression tests; add caching/payload shaping to slowest endpoints; reduce frontend bundle size and ship responsiveness release.
- Rightsize top 10 services with autoscaling caps; implement per-tenant quotas; optimize background jobs (dedupe/batch/backoff) and remove redundant jobs.
- Implement cost anomaly detection with auto-ticketing; archive cold data with lifecycle rules; enforce telemetry sampling strategies.
- Ship enterprise trust package: automated evidence capture, privileged-action audit exports, SSO/SCIM/RBAC templates, retention/deletion controls with attestations, trust center packet.
- Harden growth: centralized entitlements, metering accuracy checks, self-serve upgrades with correct proration, dunning/payment retries with observability, cancellation reason codes and churn playbooks.

### Success Metrics by Day 90

- P90 latency and throughput improved for top endpoints; frontend bundle reduced and responsiveness release shipped; top 20 expensive queries optimized with tests.
- Service spend within budget caps with autoscaling policies active; quotas live; background job waste reduced; cost anomalies alerted with tickets generated.
- Trust center live with evidence; audit exports enabled; SCIM/SSO/RBAC templates adopted; retention/deletion workflows shipped with attestations.
- Entitlements centralized; metering accuracy SLIs stable; upgrade/dunning/retry flows instrumented; churn intel collected via cancellation reasons and interventions.

## Kill List (Active Throughout 90 Days)

- Delete at least one surface area weekly (flags/endpoints/scripts/tools) via stop-doing list.
- Remove overlapping vendors/tool categories (one standard per category) and shadow config systems.
- Retire duplicate user flows, redundant dashboards/streams, one-off cron jobs, and unused dependencies.
- Enforce one-in/one-out for new endpoints, queues, or config sources.

## Ownership and Governance

- Single-threaded owners assigned for each domain and epic with decision rights; owners accountable for SLOs/error budgets and cost budgets.
- CI gates enforce SLO coverage, rollback hooks, docs, and audit logging for privileged actions; deprecation policies enforced with published timelines.
- Exceptions registry with expirations and exec signoff; incident postmortems feed prevention backlog; vendor/tool intake gate maintained with exit plans.

## Reporting and Rituals

- Weekly exec review: scoreboard (reliability, cost, security, delivery), top risks, decisions/escapes, and rollback readiness.
- Monthly: reliability release, cost report, exec narrative; quarterly: GameDay + internal audit dry run + roadmap kill review.
- Support enablement: runbooks, repair actions in admin console (dry-run + approvals), entity timeline views for debugging.

## Rollback and Safety

- Every deployment includes automatic rollback criteria tied to SLO burn, error rate, and cost anomaly thresholds; rollback tested in GameDays.
- Progressive delivery required for Tier 0/1 with canary + shadow modes; state reconciliation and backfill plans documented per migration.
- Audit logs and exception queues monitored; recovery playbooks rehearsed.
