# PR 3 — OTEL Coverage for Tier‑1 Services

Title: feat(obs): add OTEL spans + Prom exemplars (gateway, conductor, graph, api, billing, workers/index)

Why: Golden signals and SLO enforcement need trace + metrics.

Changes:

- Add ingress→downstream spans; propagate `trace_id` to logs.
- Wire exemplars in HTTP histogram metrics.

Files (targets exist):

- services/gateway/** · services/conductor/** · services/graph/** · services/api/** · services/billing/** · workers/index/**

Acceptance: Dashboards show p95/err for these paths; logs include `trace_id`.

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
