# Throughput, Toil, and Decision Velocity Playbook

## Purpose

This playbook operationalizes the nine epics provided, translating them into ready-to-run guardrails, cadences, and success measures. It is designed for immediate rollout with flat headcount while doubling throughput, shrinking toil, and reducing decision latency.

## Guiding Principles

- **Stop starting, start finishing:** Enforce flow limits and short slices to keep work moving.
- **Automation-first:** Every manual path must have an automated alternative with auditability.
- **One-way only:** Standardized pipelines, templates, and governance remove ambiguity and handoffs.
- **Observable by default:** Every change, failure, and decision is logged, owned, and measurable.

## Implementation Blueprint (by Epic)

### Epic 1 — Throughput Doubling

- **Flow baselines:** Instrument lead time, cycle time, WIP, blocked time, and rework % per team; publish weekly.
- **WIP limits:** Set per-team WIP caps; block new starts when limits are hit; dashboard alerts and Slack nudges enforce.
- **Single intake:** Route all work through one prioritized lane; reject DM/side-quests; require "Ready" checklist (spec, metrics, rollback, owner).
- **Slice size:** Break initiatives into ≤5-day slices; auto-flag two-week tasks in planning tools; require explicit risk acceptance to override.
- **PR guardrails:** Cap diff size/lines; bot enforces nudges and routes oversize PRs to structured review.
- **Unblock rituals:** Daily 15-minute unblock with decision-maker; escalation ladder after 48 hours.
- **Ownership:** Same squad owns build→deploy→support for 30 days; release markers logged to dashboards.

### Epic 2 — Kill Toil

- **Toil census:** Track top 30 toil items with hours/week and owners; burn down via automation backlog.
- **Runbook automation:** Replace manuals with one-click scripts including audit logging and dry-run/rollback modes.
- **Alert hygiene:** Deduplicate and auto-triage; noisy alerts auto-close; SLO-based signals only.
- **Self-service:** Customer-facing retry/resync/reconnect for top 10 issues; unified admin console for top 20 ops actions.
- **Pipeline-only changes:** Ban manual prod edits; policy blocks non-pipeline mutations.
- **Toil budget:** Per-engineer weekly cap with breach escalations; monthly burn review focuses on deletion before optimization.

### Epic 3 — CI/CD as a Weapon

- **Runtime cuts:** 50% CI time via caching, parallelism, and pruning redundant jobs; quarantine flaky suites, fix top 20.
- **Previews:** PR preview envs for critical flows; progressive delivery (canary→ramp→full) with auto-rollback triggers.
- **Standards:** Single golden pipeline template per repo; migration safety checks (lock time, rollback path, idempotency).
- **Release ops:** Release markers emitted to dashboards/incident timelines; one-command rollback for Tier-0 services.
- **Release notes:** Auto-generated from PR labels/tickets; change failure rate + MTTR leaderboard per service.

### Epic 4 — One Way of Doing Things

- **Service template:** Standard logging/metrics/config/health; enforced folder structure and naming conventions.
- **Governance:** Code owners and ADRs required for one-way doors; API versioning rules with deprecation windows.
- **Golden paths:** Reference implementations for common patterns; lint/type/format gates enforced with expiry-bound exceptions.
- **Library consolidation:** One auth client, logging lib, and config lib; block legacy templates in CI.

### Epic 5 — Quality Without a QA Army

- **Test tiering:** Unit for logic, contract for boundaries, e2e for revenue flows; canary checks validate business outcomes.
- **Coverage focus:** Contract-test top internal/third-party APIs; smoke tests for signup/paywall/provisioning/core usage.
- **Defect discipline:** Bug class taxonomy; reproduction + failing test for Sev-1/2; regression suite sourced from incidents.
- **Perf budgets:** Enforced in CI for key endpoints/pages; property-based tests for risky state machines.
- **Observability:** No silent failures—every failure is observable and actionable.

### Epic 6 — Product Surface Diet

- **Core focus:** Identify 20% features driving 80% usage; freeze non-core net-new unless tied to core KPIs.
- **Simplify:** Consolidate duplicate workflows, remove low-usage settings, and reduce configuration permutations with presets.
- **UX clarity:** Standardize UI components; add permission explanations; create self-serve recovery UI for common failures.
- **Sunset:** Deprecate endpoints/flags/tables tied to retired surfaces; track tickets down/activation up/cycle time down.

### Epic 7 — Cost Discipline That Funds Speed

- **Cost visibility:** Tag costs by service/tenant; weekly cost reports; anomaly alerts open tickets with probable causes.
- **Efficiency:** TTL on previews; shut down idle envs; reduce logging/metric cardinality and retention with sampling.
- **Right-size:** Scale compute/DB; cache expensive reads; move heavy work async; quotas/rate limits for noisy neighbors.
- **Lifecycle:** Archive cold data with retrieval paths; consolidate schedulers/queues; renegotiate top vendors with usage data.
- **Reinvestment:** Fixed % of savings reinvested into reliability/velocity.

### Epic 8 — Decision Latency to Near Zero

- **Decision rights:** Define ownership, SLA, and escalation ladder; 48-hour rule auto-escalates cross-team blockers.
- **Decision log:** Owner, rationale, revisit date; lightweight RFCs for cross-cutting changes with one-way door checklist.
- **Risk cadence:** Weekly top-10 risk review with shipped mitigations; exceptions registry with compensating controls and expiries.
- **Accountability:** Every service has owner + SLO + sunset plan; OKRs tied to outcomes (incidents, cost, lead time).
- **Cultural reinforcement:** Celebrate deletions/hardening as releases.

### Epic 9 — Talent Leverage

- **Onboarding:** Week-1 ship with one-command dev setup; living system map (owners, dependencies, runbooks, SLOs).
- **Mentorship & rotations:** Focused rotations on top hairy domains; reviewer SLAs with rotation to avoid bottlenecks.
- **Operational load:** Track on-call load; fix top drivers; rotate integrator to keep work unblocked weekly.
- **Career & skills:** Outcome-based career ladder; quarterly skills audit → targeted enablement; training on debugging, migrations, and incident command.
- **Finish lines:** Done = shipped + measured + cleaned up.

## Cadence & Reporting

- **Daily:** 15-minute unblock with decision-maker; WIP/blocked alerts; preview environment health.
- **Weekly:** Throughput report (shipped, blocked causes, fixes); cost report; change failure/MTTR leaderboard.
- **Biweekly:** Post-incident prevention tickets confirmed shipped; toil burn review; top risk review.
- **Monthly:** Exec packet covering shipped items, breaks, deletions, and reinvestments; celebrate hardening and deletions.

## Controls & Guardrails

- **Policy checks:** Pipelines enforce WIP caps, PR size guardrails, migration safety, lint/type/format, and no manual prod changes.
- **Escalation ladder:** 48-hour decisions escalate to owner → director → exec; logs feed decision registry.
- **Auditability:** All automations log inputs/outputs, dry-run results, approvals, and rollbacks.

## Metrics Dashboard (minimum set)

- Lead time, cycle time, WIP, blocked time, rework % per team.
- PR size distribution; change failure rate; MTTR; flaky test quarantines/resolutions.
- Toil hours/week per item; toil budget breaches; automation coverage % of runbooks.
- Cost by service/tenant; preview TTL compliance; idle-env reclamations; cache hit rates; rate-limit breach counts.
- Decision SLA adherence; escalation counts; exception registry expirations; risk mitigation throughput.

## Rollout Plan

1. **Week 0–1:** Baseline flow/toil/CI metrics; publish dashboards; set WIP limits; stand up daily unblock and decision log.
2. **Week 2–3:** Enforce PR size guardrails; enable preview envs for critical flows; freeze non-core net-new; start toil automation backlog.
3. **Week 4–6:** Progressive delivery with auto-rollback; migrate top runbooks to one-click automation; launch admin console actions; enable cost tagging and anomaly alerts.
4. **Week 7–9:** Standardize service template and golden pipeline; enforce migration safety checks; roll out self-serve recovery UI and permission explanations; consolidate libraries.
5. **Week 10+:** Tighten perf budgets; expand contract tests; operationalize one-command rollback drills quarterly; refresh risk log and exceptions registry monthly.

## Forward-Looking Enhancements

- **Adaptive WIP & PR guardrails:** Use historical throughput to auto-tune limits and diff caps per team/repo.
- **Autonomous remediation:** Pair anomaly detection with pre-approved runbooks for safe auto-remediation under caps.
- **Intelligent slicing assistant:** Suggest ≤5-day slices and dependency maps from specs to reduce rework and blockers.
