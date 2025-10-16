# Sprint 25 — GA Core Hardening & Guardrails (Oct 6–17, 2025, America/Denver)

Day‑1 artifacts and wiring:

- `policy/export/export.rego` with unit tests; `opa test policy -v` in CI.
- Grafana dashboard at `ops/grafana/dashboards/ga_core_dashboard.json` (provision via `ops/grafana/provisioning/...`).
- Jira import CSV at `project/pm/sprint25_jira.csv` (Epics → Stories → Sub‑tasks).

Flags (Stage for 2 days): adjudication, NL→Cypher guardrails, export verifier.
