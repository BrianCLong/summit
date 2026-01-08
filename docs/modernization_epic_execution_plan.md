# Modernization Epic Execution Plan

This plan operationalizes the nine modernization epics by defining scope, immediate actions, and governance controls. It is optimized for incremental delivery with measurable outcomes and strong boundary enforcement.

## Execution Principles

- **Domain-first:** Stabilize domain boundaries before consolidating code paths.
- **Contracts everywhere:** APIs/events must be versioned, contract-tested, and observable.
- **Progressive cutovers:** Use adapters, flags, and N-1 compatibility to reduce blast radius.
- **Golden path:** Preserve deployability; every change must keep CI green and rollback-ready.

## Epic 1 — Domain Reset

- **Top friction domains (target backlog triage in week 1):** case intake, entity resolution, graph query, authorization, and audit/provenance.
- **Bounded contexts:** define ownership, commands, events, and read models per domain; publish map in `docs/domains/` with one authoritative write path each.
- **Boundary safety:** kill cross-domain DB access via adapters, enforce standard error model, and add boundary-violation metrics with zero-tolerance SLO trend.
- **Reliability:** add domain SLOs/error budgets tied to user journeys; enforce ADRs with revisit dates for domain decisions.

## Epic 2 — Modular Monolith Core

- **Consolidation candidates:** graph query + entity resolution + provenance ledger (chatty, shared DB, shared auth needs).
- **Internal module system:** define clear module interfaces, forbid circular imports, and centralize authz/authn inside the core boundary.
- **Efficiency:** replace intra-core RPC with in-process calls, unify config/feature flags, and ship a single deploy artifact for the core.
- **Testing:** exhaustive contract/property tests around core write paths and post-merge cost/latency tracking.

## Epic 3 — Strangler Layer

- **Adapter edge:** place adapters in front of legacy APIs/services; start with low-volume traffic shadowing.
- **Parity & drift:** implement shadow reads/writes, parity dashboards, and drift alerts; maintain migration harness for backfill/verify/cutover/rollback.
- **Lifecycle:** feature-flagged cutovers with rollback steps, telemetry-based deprecation, and monthly legacy endpoint removals.

## Epic 4 — Repository & Build Consolidation

- **Inventory & target model:** catalog repos/pipelines/build times/owners; choose monorepo vs few-repo federation.
- **Standardization:** shared CI templates, dependency management, code owners, and golden-path scripts for fast local dev and seeded data.
- **Efficiency:** preview environments for critical components, halve CI time via caching/parallelism, and remove duplicate pipelines/build scripts.

## Epic 5 — Database Convergence

- **Source of truth:** name system-of-record tables per domain; eliminate dual writes and non-owning access.
- **Safety:** add FK/unique/check constraints aligned to invariants and transactional outbox for write-aligned events.
- **Resilience:** reconciliation for critical entities, hot partitioning/cold archiving, migration safety checks (expand→migrate→contract), and quarterly schema audits.

## Epic 6 — API & Event Contract Unification

- **Standards:** publish API style guide (versioning/errors/pagination/idempotency) and schema registry with compatibility gates in CI.
- **Contracts:** convert top APIs to OpenAPI/gRPC specs with consumer-driven contract tests and unified delivery (retries/DLQ/signatures).
- **Tooling:** event replay with tenant-safe controls, standardized webhook signing/replay protection, typed SDKs, and cron-to-event migrations.

## Epic 7 — Shared Platform Primitives

- **Libraries:** standard auth client, logging/metrics/tracing, config/feature flags, caching patterns, and idempotent job/queue wrappers.
- **Controls:** shared permissions/policy engine, rate limiting/quotas, admin action framework (audit/approval/dry-run), and tenant context middleware.
- **Quality:** standardized error handling/retry semantics, reusable test harnesses, and quarterly deletion of duplicate implementations.

## Epic 8 — Legacy Feature Diet

- **Rationalization:** rank legacy features by usage/revenue/support risk; publish deprecation slate with comms and migration tooling.
- **Simplification:** consolidate variants into canonical versions, remove retired flags/config branches, delete dead endpoints/UI routes, and archive/drop legacy data.
- **Outcomes:** track support-ticket reduction and reliability gains; celebrate deletions as first-class releases.

## Epic 9 — Refactor Governance

- **Guardrails:** enforce architecture non-negotiables (domains/ownership/contracts/deprecation) with review SLAs and ADRs for one-way-door decisions.
- **Accountability:** dependency budgets per repo/service, exception registry with expirations, and KPIs for boundary violations/tech debt/duplication.
- **Operational rigor:** quarterly game days for migrations/rollbacks and monthly refactor reports highlighting simplifications, speedups, and removals.

## Metrics & Reporting

- **Velocity & quality:** incident rate, latency p95/p99, deploy failure rate, CI time, coverage of contract tests, and boundary-violation trend to zero.
- **Migration health:** shadow parity scores, drift alerts acknowledged/resolved, deprecation burn-down (endpoints/services per month), and schema audit deltas.
- **Financial:** infra footprint changes post-consolidation and storage/caching savings from partitioning/archival.

## Forward-Looking Enhancement

- **Predictive risk engine:** add ML-driven risk scoring that ingests domain events to forecast boundary violations or drift, auto-adjusting feature flags/traffic weights before incidents.
