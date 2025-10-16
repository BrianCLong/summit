## What

Implements the v24 slice end‑to‑end: GraphQL query/mutation/subscription, Redis‑backed PubSub, persisted‑query allowlist, OPA authorization, Prometheus metrics (/metrics), SLO gates, SBOM/vuln scans, evidence bundle, and release overlays.

## Why

Deliver tenant‑scoped coherence signals and score with strict guardrails: p95 read ≤ 350 ms, p95 write ≤ 700 ms, error‑rate ≤ 0.1%, subscription fan‑out p95 ≤ 250 ms. Enforce policy and cost controls per org defaults.

## Changes

- API: SDL + resolvers; persisted queries enforced via middleware.
- Ingest: HTTP/Kafka placeholders with idempotency.
- Storage: Neo4j signals + Postgres materialized `coherence_scores`.
- AuthZ: OPA policies (`policy/graphql.rego`) + tests.
- Observability: Prometheus histogram `graphql_request_duration_seconds`; /metrics endpoint; basic tracing hooks.
- CI/CD: lint, typecheck, test, OPA tests, k6 SLO tests, SBOM, vuln scan, evidence bundle.
- Ops: Helm overlays, HPA/PDB, PrometheusRule, data retention cron, dashboard excerpt.

## Evidence (attach artifacts)

- `.evidence/slo/summary.json`
- `.evidence/security/sbom.syft.json`
- `.evidence/security/vulns.grype.json`
- `.evidence/policy/opa_report.json`
- `.evidence/ops/metrics-snapshots/*.json`

## SLOs

- Read p95 ≤ **350 ms**; Write p95 ≤ **700 ms**; Error‑rate ≤ **0.1%**; Subscription fan‑out p95 ≤ **250 ms**.

## Risk/Impact

Low‑medium. Canary with auto‑rollback on SLO breach; feature‑flagged (`v24.coherence`).

## Rollback

- Toggle `v24.coherence=false`.
- Helm rollback to previous revision.
- Route reads to Postgres only (materialized scores).

## Checklists

<!-- This checklist should be completed by the author of the pull request -->

- [ ] CI green (tests, OPA, SBOM, vuln scan)
- [ ] k6 SLO suite within budgets
- [ ] Persisted query hashes frozen in `.maestro/persisted-queries.json`
- [ ] Helm alerts and dashboard applied in staging
- [ ] Runbooks updated; on‑call aware

**Reviewers:** SRE, Eng Leads, Platform Architecture (CODEOWNERS enforced)
