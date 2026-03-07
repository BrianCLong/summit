# Toil Reduction and Reliability Operating Plan

## Purpose

Create a structured, measurable program that reduces on-call toil, deletes noisy alerts, and shifts the system toward self-healing operations while maintaining production safety.

## Scope

- All on-call rotations (Tier 0/1 services prioritized).
- Alerting, runbook automation, admin console, and release safety tooling.
- Applies to service owners, SRE, and platform teams.

## Definitions

- **Toil**: Repetitive, manual, automatable, low-value work that does not produce enduring improvements. Use this criteria when tagging incidents and work items.
- **On-call load**: Pages per week, after-hours percentage, MTTA/MTTR, and top alert sources.
- **Tier 0/1**: Customer-impacting paths mapped to SLOs and error budgets.

## Operating Model

- **Toil budget**: Max 5 hours/person/week on toil; breach triggers corrective actions and leadership visibility.
- **One-in/one-out alerts**: New alert requires removal of an existing alert unless it replaces a legacy signal.
- **Exceptions registry**: Manual processes allowed only with owner and expiry date; auto-expire unless renewed.
- **Weekly review**: 15-minute toil and alert quality review with decision-maker present; actions and owners recorded.

## Measurement and Instrumentation

- Dashboard metrics: pages/week, after-hours %, MTTA/MTTR, false-positive rate, alert cost (pages × time), automation coverage, repeat incidents, toil budget burn-down.
- Data sources: alerting platform, incident tracker, deploy events, SLO burn rates, queue/worker metrics.
- Success thresholds: >20% page reduction per quarter, >30% MTTR reduction on top drivers, <5% false-positive rate on Tier 0/1 pages.

## Execution Roadmap by Epic

### Epic 1 — On-Call Baseline & Toil Census

- Launch 2-week toil diary across rotations; categorize every interrupt and quantify frequency × minutes × severity.
- Rank top 20 toil drivers and publish ownership and fix-by dates.
- Delete 10 highest-noise alerts immediately; replace with SLO-based signals where applicable.
- Freeze new alerts unless they replace an existing one; enforce via alert registry review.

### Epic 2 — Alert Rationalization

- Enforce paging policy: only SLO burn or user-impacting Tier 0/1 conditions page humans.
- Require alert metadata (owner, runbook link, severity, service, taxonomy). Gate merges lacking metadata.
- Consolidate duplicates, add multi-signal triggers (error rate + latency + synthetics), and suppress known issues with expiry.
- Track false-positive rate weekly and kill worst offenders using alert cost accounting.

### Epic 3 — Self-Healing & Auto-Remediation

- Identify top 10 resolvable incident types (stuck jobs, deadlocks, cache thrash, queue lag, etc.).
- Implement safe, idempotent auto-remediation actions with dry-run mode, audit logs, and verification steps.
- Add circuit breakers, backoff, progressive throttling, and automated rollbacks on Tier 0/1 SLO burn.
- Maintain remediation library; expand coverage monthly based on success rate.

### Epic 4 — Admin Console as an Ops Weapon

- Inventory top 30 manual operational actions; migrate 10 scripts into console actions with SSO/MFA, RBAC, audit logging.
- Provide dry-run diffs/confirmations, approval workflows for high-risk actions, and break-glass access with time-boxed privileges.
- Embed runbooks, diagnostics, and timelines (customer and entity views) directly into the console.

### Epic 5 — Runbook Automation & ChatOps

- Convert top 20 runbook procedures into executable automations with guardrails (rate limits, approvals, dry-run).
- Ship ChatOps commands with RBAC and audit logs; add guided diagnostics and “first 5 minutes” bot suggestions.
- Auto-generate incident timelines and deprecate manual-only runbooks once automation ships.

### Epic 6 — Reliability Engineering to Reduce Pages

- Set SLOs for 3–5 critical user journeys with published error budgets; tie roadmap scope to budget health.
- Fix top 10 error classes by impact; implement idempotency for retried writes and degrade modes/fallbacks.
- Standardize timeouts/retries/circuit breakers; add backpressure, fair scheduling, and DB contention fixes.
- Run monthly GameDays; escalate repeat incidents that breach thresholds and delete brittle hacks after systemic fixes.

### Epic 7 — CI/CD & Release Safety

- Enforce canary → ramp → full deploys with automated rollback on SLO burn and release envelopes for risky changes.
- Add deploy verification tests for critical journeys and release markers in observability.
- Quarantine flaky tests, reduce change failure rate via smaller PRs, and run quarterly rollback drills.

### Epic 8 — Capacity & Load Guardrails

- Implement per-tenant rate limits/quotas, fairness for worker pools, and overload dashboards (queue depth, saturation, latency).
- Add autoscaling with caps/cooldowns, request shedding, degrade modes, and cost-aware throttling.
- Run peak load tests; add anomaly detection for usage spikes and brownout mode runbooks/automation.

### Epic 9 — Toil Governance That Sticks

- Publish toil scorecard (pages/person, after-hours %, automation coverage, repeat incidents, alert cost) and monthly release notes.
- Maintain toil backlog with owners/deadlines; include toil OKRs in performance expectations.
- Require one-in/one-out alerts, runbooks for pages, and toil reduction action in every postmortem.
- Reward alert deletion and automation; auto-expire exceptions with exec escalation.

## Ownership and Cadence

- **Program DRI**: SRE lead accountable for overall targets and dashboards.
- **Service owners**: Responsible for alert metadata, runbooks, and remediation coverage for their services.
- **Weekly**: Toil review (15 minutes) and alert false-positive tuning.
- **Monthly**: Toil burn sprint and self-healing coverage expansion.
- **Quarterly**: GameDays and rollback drills with executive readouts.

## Guardrails and Controls

- Merge gates enforce alert metadata and runbook links for page-worthy alerts.
- Exceptions registry with expiry; reminders sent 7 days before expiry.
- Audit logging for all automation and admin console actions; dry-run required for new remediation steps.
- Rollback and circuit breaker policies documented per service; tested during drills.

## KPIs and Targets

- Pages reduced by >20% QoQ; after-hours pages reduced by >25% QoQ.
- MTTA < 5 minutes for Tier 0/1; MTTR down 30% on top drivers.
- Automation coverage: >60% of repeatable incidents; remediation success rate tracked and growing monthly.
- False-positive rate <5% for Tier 0/1; alert duplication reduced by 50%.

## Reporting and Transparency

- Public toil dashboard with owners, targets, and current performance.
- Monthly “toil reduction release notes” summarizing deleted alerts, new automations, and hours saved.
- Post-incident actions must include at least one toil reduction item with owner and due date.

## Risks and Mitigations

- **Risk**: Over-suppression hides real incidents. **Mitigation**: Require SLO-based signals and expiries on suppressions.
- **Risk**: Automation causes regressions. **Mitigation**: Dry-runs, audit logs, verification checks, and progressive rollout.
- **Risk**: Governance fatigue. **Mitigation**: Lightweight weekly reviews and automated reminders for expiries/budgets.

## Forward-Looking Enhancements

- Adaptive alerting using anomaly detection tuned by historical false-positives.
- Reinforcement learning feedback loop to prioritize remediation expansion based on impact reduction.
- ChatOps copilot that proposes automation pull requests from toil diary patterns.
