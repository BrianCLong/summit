# RELEASE_NOTES_v2.5.md

> IntelGraph Platform • **Version:** 2.5 (GA) • **Release date:** 2025-08-27 • **License:** MIT

## Overview

IntelGraph v2.5 is a production-ready release delivering hardened GraphQL APIs across four new security domains, real‑time Detection→Incident→SOAR automation, audited MLOps promotion gates, and enterprise guardrails for Crypto and OSINT. This GA aligns to Council Wishbook GA‑core acceptance criteria and ships with full runbooks, Helm hardening, and comprehensive test coverage.

## Highlights

- **Real‑time Security Loop:** GraphQL subscriptions stream alerts → auto‑escalate to incidents → execute SOAR playbooks with async workers and full audit.
- **MLOps Promotion Gates:** 5‑gate pipeline (accuracy, F1, regression, security, bias) with drift detection, A/B testing, and safe rollback.
- **Governance by Design:** RBAC/ABAC + policy‑by‑default denials, warrant/authority binding, step‑up auth, immutable audit trails.
- **Data Layer Enhancements:** PostgreSQL migrations (detections/incidents, MLOps artifacts, OSINT/forensics, crypto approvals/HSM ops) and Neo4j graph tuning with temporal indexing.
- **Operational Excellence:** Helm charts with network policies, PSS (restricted), SLO dashboards, Prometheus/Grafana + OTEL + Jaeger, DR runbooks.

## What's New

### GraphQL Schemas & Resolvers

- `rt-security.graphql` — detections, alerts, incidents, SOAR workflows
- `mlops.graphql` — model lifecycle, gates, evaluations, drift
- `osint-forensics.graphql` — sources/tasks, legal basis, chain‑of‑custody
- `crypto.graphql` — cryptographic analyses with dual‑control & HSM ops

**API notes**

- Persisted queries with cost/depth limits.
- Field‑level auth (RBAC/ABAC) and tenant isolation.
- Subscriptions for live streams; back‑pressure & rate‑limit guards.

### Database Migrations

PostgreSQL (v15+)

- `001_rt_security_tables.sql`
- `002_mlops_tables.sql`
- `003_osint_forensics_tables.sql`
- `004_crypto_tables.sql`

Neo4j (5.x)

- `004_rt_security_and_crypto_nodes.cypher` (indexes, temporal and relationship optimizations; cross‑domain correlation labels)

### RT Detection → Incident → SOAR

- Thresholded auto‑escalation with configurable severity.
- Playbook DSL with parallel action execution and compensating actions.
- End‑to‑end audit trail; GraphQL events mirrored to Kafka for replay.

### MLOps Evaluation Service

- Automated metric computation; gate evaluation and signed promotion decisions.
- Drift monitors (population/feature/label); auto‑retrain triggers with approvals.
- A/B testing with traffic‑split config and automatic rollback on burn alerts.

### Security Guardrails (Crypto & OSINT)

- Export‑control enforcement (ITAR/EAR‑like) with geographic restrictions.
- Dual‑control approvals for sensitive crypto operations (maker/checker).
- OSINT legal‑basis validation (purpose, authority, retention) with GDPR‑aligned redaction.

### Observability & SRE

- OTEL traces, Prometheus metrics, Jaeger tracing; SLO burn‑rate alerts.
- Log aggregation (ELK) with 90‑day retention; budget/cost guardrails.

### Testing

- k6 perf suites (RT Security 50–100 VUs; Crypto 5–25 VUs) with CI gating.
- Playwright E2E (50+ scenarios); cross‑browser (Chrome/Firefox/Safari/Mobile).
- Security tests: CSP strict, policy simulation, denied‑action coverage.
- Accessibility scans via axe‑core.

## Compatibility Matrix

- **Client:** Chrome 120+, Firefox ESR, Safari 17+
- **Server Runtime:** Node.js 18+
- **Kubernetes:** 1.27–1.30 (tested on 1.29)
- **PostgreSQL:** 15+
- **Neo4j:** 5.x

## Performance & SLOs

- p95 API latency **< 2s** (target) across typical graph neighborhoods.
- Error rate **< 1%**; autoscaling 2–20 replicas under load.
- 99.9% uptime objective with synthetic checks and burn‑rate alerts.

## Security & Compliance

- Zero‑trust network policies; Pod Security Standards (restricted).
- Secrets externalized & rotated; container images scanned and hardened.
- GDPR/CCPA controls; chain‑of‑custody; export‑control validation; immutable audit.
- SBOMs (Syft) and provenance attestations (SLSA-aligned) available in release artifacts.

## Breaking Changes

- **None.** Backward compatibility maintained; new fields are additive. Legacy aliases remain until v2.6 where noted in Deprecations.

## Deprecations (scheduled removal v2.6 unless extended)

- `Query.searchGlobal` (use scoped, policy‑aware search endpoints)
- `Mutation.runPlaybook` without `reasonForAccess` (requires justification)

A deprecation warning is emitted on server startup and in GraphQL extensions until v2.6.

## Upgrade Notes

0. **Run** `helm diff` against production values and `dry-run apply`.
1. **Back up** Postgres and Neo4j; confirm PITR snapshots.
2. Apply **DB migrations** in order `001` → `004`.
3. Apply **Helm chart** upgrades; enable network policies and PSS(restricted).
4. Rotate **secrets** using sealed‑secrets; verify RBAC/ABAC policy bundles.
5. Re‑index Neo4j temporal indexes; run `:schema` sanity checks.
6. Run CI **perf and E2E** suites; validate SLO dashboards and burn alerts.

## Helm Chart Changes

- New values under `networkPolicy`, `podSecurity`, `sealedSecrets`, `canary`.
- `ingress.className` now required; default `nginx` in examples.
- Enable `PSS (restricted)` profile in `podSecurity`.

## Known Issues

- In air‑gapped topologies, OTEL exporter must use file/sidecar mode.
- When tracing is disabled, GraphQL subscription reconnect-backoff logs may appear verbose (tunable via `LOG_LEVEL=warn`).

## Deliverables (Artifacts)

- Release notes (this file)
- One‑page executive brief (`EXECUTIVE_BRIEF_v2.5.md`)
- Updated roadmap (`docs/ROADMAP.md`)
- Runbooks: Production Deployment, Incident Response, Ops SOPs

## Acknowledgements

Thanks to the IntelGraph engineering, SRE, and governance teams for the push to GA.

---
