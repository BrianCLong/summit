Maestro Expansion Plan (Dev → Full Orchestrator)

Scope

- PM integrations (GitHub/Jira), workflow editor, observability, autonomy/RBAC, recipes, UAT, reporting.

Phases

1. Edge & E2E: CF Full(strict), Apache Origin CA, `/graphql` proxy, Playwright e2e.
2. PM Integration: GitHub App + Jira sync, tickets model, board and details UI.
3. Workflow Editor: React Flow DAG editor, runs viewer, policy gates.
4. Observability: OTEL traces, Prom metrics, logs; embedded dashboards.
5. Autonomy & RBAC: roles, approvals, audit, autonomy levels.
6. Recipes: registry + initial catalog, run from UI.
7. UAT: intelgraph-dev targets, gating and reports.

Validation

- Playwright: routes, /api/health, /api/status, GraphQL probe, optional mutation roundtrip.
- UAT checklists, promotion gates, defect auto-linking.

Security

- Secrets via env/SSM; RBAC; audit logs; feature flag gates; outbox + saga; canary rollouts.
