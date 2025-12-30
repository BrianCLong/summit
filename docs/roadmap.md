# Summit (IntelGraph) Roadmap

This roadmap reflects the current Summit (IntelGraph) platform reality: **v2.0.0 shipped in December 2025** and we now operate on a **2-week Golden Path release train** (see [README Release Cadence](../README.md#-release-cadence)). The immediate focus is **stability, reliability, supply-chain security, and user-visible performance**.

## Current State — GA Baseline (v2.0.0)

- Enterprise intelligence platform with graph analytics, real-time collaboration, and AI-driven insights.
- Hardened stack: rate limiting, GraphQL complexity limits, IDOR fixes, load balancing, multi-tier caching, and telemetry.
- Data tier: Neo4j for relationships, PostgreSQL/Timescale for structured and time-series data, Redis for caching/pub-sub.
- Orchestration: Maestro (BullMQ) for background jobs and AI pipelines.

## Active Sprint (Dec 29, 2025 → Jan 9, 2026)

- **Operational readiness:** Ship `/healthz`, `/readyz`, and `/status` endpoints with probes documented.
- **Developer velocity:** Standardize `make bootstrap` / `make test` and CI workflow with caching and artifacts.
- **Supply-chain integrity:** Generate and sign SBOMs (Syft + cosign) with provenance verification in CI.
- **Graph performance:** Introduce Canvas + Web Worker renderer to eliminate hairball freezes on large graphs.
- **Backlog hygiene:** Convert “Review X.md” issues into actionable, labeled engineering tickets.

## Near-Term Themes (Q1 2026)

- **Golden Path resiliency:** Keep `make smoke` green; expand health/readiness coverage and automated rollback playbooks.
- **Observability & SRE:** Standard dashboards/alerts for API latency, worker throughput, queue health, and database readiness.
- **CI/CD standardization:** Reproducible builds with artifact retention, coverage gates, and consistent jest/vitest setup across packages.
- **Supply-chain security:** Fail-closed provenance checks, signed releases, and stricter branch protections/code scanning.
- **Frontend performance & UX:** Configurable graph renderer thresholds, non-blocking interactions, and accessibility audits.

## Medium-Term (H1 2026)

- **Scalability & cost controls:** Auto-scaling policies for workers and services, cache hit-rate optimization, and cold-start budgets.
- **Data governance:** Expanded policy-as-code for access control, immutable audit logging, and retention/PII guardrails.
- **Collaboration & workflow:** Improved real-time co-analysis, annotation workflows, and shared playbooks.
- **AI/ML enhancements:** Higher-accuracy entity/event extraction, safer RAG pipelines, and evaluation harnesses tied to CI.

## Ongoing Commitments

- Documentation stays in lockstep with shipped features and the Release Cadence in the README.
- No merge without Golden Path CI passing; regressions trigger immediate stabilization work.
- Security findings, compliance exceptions, and SLO breaches must be tracked with remediation owners and timelines.
