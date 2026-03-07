# Correctness Program Blueprint

This document operationalizes the correctness epics into a coherent program with ownership, guardrails, and rollout expectations. It is designed for day-1 execution and weekly governance.

## Program Overview

- **Goals:** Eliminate drift, dual writes, and hidden state inconsistencies; make correctness observable and supportable; ensure migrations and events have disciplined contracts.
- **Operating cadence:** Weekly truth council, monthly governance review, quarterly game days.
- **Ownership:** Single-threaded owners per domain (customer, billing, usage, content, permissions) with on-call rotation and incident response alignment.

## Epic 1 — Declare Truth (systems of record)

- **System-of-record map:** Name SoR per domain and publish a truth map showing writers, readers, caches, and sync paths. Ban new dual writes unless mitigations are documented and approved.
- **Canonical identity:** Define canonical IDs, merge/split policy, and identity resolution rules; expose “truth check” tooling for support and engineering.
- **Governance:** Track truth debt (duplicate sources, dual writes, manual fixes) and resolve via weekly truth council decisions.

## Epic 2 — Invariants Everywhere

- **State discipline:** Replace critical booleans with explicit state machines; codify invariants per domain with DB constraints (NOT NULL, UNIQUE, CHECK, FK where safe).
- **Runtime enforcement:** Add validators to write paths, idempotency keys for retries, guardrails for bulk ops (dry-run/diff/approval), and violation capture + quarantine flows.
- **Lifecycle:** Incident postmortems must add at least one new invariant or prevention mechanism.

## Epic 3 — Reconciliation Engine

- **Drift catalog:** Identify top 10 drift pairs (DB vs cache, service vs service, billing vs entitlements) and classify by risk tier.
- **Framework & cadence:** Build reconciliation framework with schedules (hourly/daily), exception queues with owners/SLAs, and dashboards/alerts on drift rate, age, and recurrence.
- **Remediation:** Provide safe auto-fix classes, human-review queues for risky classes, and replay-safe corrective actions.

## Epic 4 — Migration Factory

- **Stages:** Dual-run (optional) → backfill → verify → cutover → delete. Require decommission plan before start.
- **Tooling:** Backfill framework with checkpointing, batching, retries, DLQ, load-shedding; verification toolkit (row counts, hashes, invariants, sampling diffs); shadow reads to prove parity before cutover.
- **Governance:** Migration manifests define scope/success; progress reporting includes percent complete, error classes, and lag; pilot migrations precede broader rollout.

## Epic 5 — Event & Contract Discipline

- **Standards:** Event naming/payload/versioning rules with schema registry and compatibility checks in CI; consumer-driven contract tests for critical consumers.
- **Safety:** Idempotent handlers with dedupe keys, ordering guarantees where required, replay tooling with guardrails, DLQs with triage and auto-retry.
- **Lifecycle:** Event catalog with ownership, minimal payloads, PII hygiene, and deprecation policy (announce → dual-publish → remove); replace bespoke sync jobs with event-driven pipelines.

## Epic 6 — Observability for Truth

- **Telemetry:** Standard correlation IDs across boundaries; mandatory who/what/when/why in state-changing logs; trace spans for critical writes and transitions.
- **Correctness signals:** Dashboards for invariant violations and reconciliation drift, alerting on correctness metrics, release markers on dashboards.
- **Forensics:** Record timeline view per entity, audit logs for sensitive changes with immutable storage, runbooks for top correctness failures, weekly correctness scorecard by domain.

## Epic 7 — Admin + Repair Tools

- **Consolidation:** Inventory manual fixes; build single admin console with SSO/MFA, RBAC, scoped access (tenant/time limited), and repair queues for risky operations.
- **Safety & auditability:** Dry-run diffs, approvals for high-risk repairs, audit logging of who/why/what, guardrails (rate limits, blast radius warnings, mandatory notes).
- **Standard actions:** Resync/rebuild/recompute/unlock/reissue flows; migrate top repairs into the console and block unapproved scripts via expiring exceptions.

## Epic 8 — Customer-Facing Correctness

- **Transparency:** Surface last updated/sync/computed indicators; parity-focused exports that reflect canonical truth; consistency health dashboards for admins.
- **Controls:** Safe resync/retry actions, clear error reasons with next steps, validation warnings before destructive actions, improved search correctness.
- **Trust releases:** Data parity reports for migrations/imports; ship correctness-focused releases with GTM/support enablement and ticket deflection goals.

## Epic 9 — Governance of Truth

- **Accountability:** Correctness OKRs per domain (drift rate, invariant violations, MTTR); data-incident severity rubric including correctness Sev-0.
- **Process:** Schema change review for high-impact tables/events, code owners on domain logic/migrations, exception registry with expirations, public backlog of correctness hotspots.
- **Continuous rigor:** Quarterly correctness game days, leadership reporting on correctness metrics, and celebrations for deleted drift sources/dual writes.

## Implementation Guidance

- **First 30 days:** Publish system-of-record map, assign domain owners/on-call, stand up invariant docs, and launch truth council. Start reconciliation for top 3 drift pairs and design migration manifests for the ugliest debt migration.
- **Quarterly checkpoints:** Track truth debt burn-down, invariant violation trend, drift recurrence, and migration factory throughput. Feed lessons into event standards and admin tool backlog.
- **Success metrics:** Reduced dual writes, faster MTTR for correctness incidents, lower drift rate/age, fewer manual fixes, and measurable ticket reduction for inconsistency issues.

## Forward-Leaning Enhancements

- **Autonomous guardrails:** Explore policy-driven generators that emit invariants and reconciliation rules from domain schemas, feeding contract tests and telemetry expectations automatically.
- **Probabilistic detection:** Add sampling-based anomaly detection on reconciliation signals to surface emerging drift classes before they become systemic.
