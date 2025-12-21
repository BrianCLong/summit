# Sprint Goal — IntelGraph Advisory (Next Sprint)

Deliver the NL→Cypher preview, provenance-first execution path, and cost guard controls so analysts can safely author authority-aligned graph queries, observe lineage, and ship demo-ready dashboards with reliable SLOs.

## Success Metrics
- NL→Cypher preview provides validated recommendations with ≥95% precision on curated fixtures and under 400 ms median latency for top-3 suggestions.
- Provenance ledger beta captures ≥95% of mutating events with end-to-end trace links and exposes a signed export API for R2/R3 demos.
- SLO dashboards operational with error budget tracking for tri-pane flows; dashboard JSON hook exposed for exec reporting.
- Cost guard flags >90% of quota excursions in pre-production and blocks >80% of intentionally adversarial overage attempts in chaos drills.
- Demo data script seeds reproducible fixtures enabling all runbooks to complete in <20 minutes.

## Scope Boundaries
- In-scope: NL→Cypher preview UI contracts, authority compiler policies, provenance ledger beta, SLO dashboards, cost guard, chaos drills, k6 load harness, import-ready backlog artifacts.
- Out-of-scope: Production rollout of dynamic pricing, on-prem deployment automation, and non-Postgres storage backends.

## Non-Goals
- Replacing existing search UI; we focus on tri-pane workflow support.
- Relaxing existing RBAC; all new features inherit current authz model.
- Introducing new third-party dependencies without security review.

## Milestones
- **R1**: Demo data + authority compiler contract validated; NL→Cypher preview wired to policy evaluator.
- **R2**: Provenance ledger beta writes/reads validated; SLO dashboards render seeded data; KPIs logged for demo.
- **R3**: Cost guard enforcement and chaos drills completed; export verification results captured.

## Dependencies
- Policy registry service availability for authority compiler lookups.
- Neo4j sandbox for preview execution; Postgres for ledger metadata.
- OIDC test tenant for RBAC-backed preview requests.
