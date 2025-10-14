# IntelGraph Workorders Status (PR-5 → PR-22)

- PR-5: Copilot v1 — client panel + command palette wired; server cost estimator added; service endpoint placeholder via API `/copilot/estimate`.
- PR-6: ABAC — OPA policy + withABAC wrapper on entity/investigations; tests scaffolded; policySim in GraphQL.
- PR-7: UI tri-pane/command palette — palette commands integrated; Copilot panel added.
- PR-8: Entity Resolution v1 — verify in next wave (placeholders exist in services/api Python).
- PR-9: Prov-Ledger — provenance present; DAG/export verification queued.
- PR-10: Analytics v1 — centrality/community resolvers added; coordination edges API present.
- PR-11: Release hardening — slow-query logger toggle, k6 smoke added.
- PR-12: Connectors/Ingest Wizard — API routes (schema/dry-run/start/progress/cancel), schema-driven UI.
- PR-13: Docs & Acceptance — cookbook, runbooks outline, training outline drafted.
- PR-14: GA prep — RC/SBOM scripts, perf budget, perf snapshot.
- PR-15: Deep perf — plan doc, UI perf toggle; client/server cost estimator.
- PR-16: OIDC/JWT via JWKS in auth middleware; backup/DR runbook + script; admin endpoints (tenants/users/audit/flags).
- PR-17: Copilot v2 groundwork with safety/estimate endpoints stubbed; cookbook coverage extended.
- PR-18: Admin Console backend stubs available (tenants/users/audit/flags).
- PR-19–20: Cases + evidence routes with approvals, exports, annotations, PDF export stub.
- PR-21: Analytics expansion with link prediction placeholder.
- PR-22: LP→Edge triage queue endpoints (suggest, approve, materialize).

This tracker will be updated as we verify remaining PRs and close gaps.

Next validation steps
- Apply migration `services/api/migrations/010_cases_evidence_triage.sql` if `USE_DB=true` is desired for persistence.
- Capture screenshots via `scripts/docs/capture_screenshots.sh` and embed in cookbook.
- Run `npm run test:api` (ABAC tests) and `npm run perf:snapshot`.
