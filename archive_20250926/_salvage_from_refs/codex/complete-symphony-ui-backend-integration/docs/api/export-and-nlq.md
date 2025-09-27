# Sprint 14 — Export & NL Query Contracts

This document captures the minimal API contracts added for the Sprint 14 vertical slices.

## GraphQL (services/api)

- Mutation `exportCase(caseId: ID!): ExportBundle!`
  - Enabled by `FEATURE_PROV_LEDGER_MVP=true`
  - When `FEATURE_EXPORT_POLICY_CHECK=true`, blocked exports return `blockReason` with a human‑readable message.
  - Fields:
    - `zipUrl: String` — optional; may be null in MVP
    - `manifest: JSON!` — hash tree manifest
    - `blockReason: String` — policy/licensing reason when blocked

- Mutation `previewNLQuery(prompt: String!, tenantId: String!, manualCypher: String): NLPreview!`
  - Enabled by `FEATURE_NL_QUERY_PREVIEW=true`
  - Returns generated Cypher and planner estimates. Runs sandbox path only.
  - Fields:
    - `cypher: String!`
    - `estimatedRows: Float`
    - `estimatedCost: Float`
    - `warnings: [String!]!`
    - `diffVsManual: JSON`

## Service Endpoints (optional wiring)

- `PROV_LEDGER_URL` — base URL for provenance ledger service (expects `/bundles/build`).
  - Optional `PROV_LEDGER_API_KEY` header is sent as `X-API-Key`.
- `RAG_URL` (or `NLQ_URL`) — base URL for NL→Cypher generation service (expects `/cypher`).

## Cost Guard (MVP)

When `FEATURE_COST_GUARD_MVP=true`, a per‑tenant token bucket enforces a basic budget on `/graphql`:

- Capacity: `COST_GUARD_CAPACITY` (default 1000 tokens)
- Refill: `COST_GUARD_REFILL_TPS` (default 50 tokens/second)
- On budget exhaustion: returns HTTP 429 with `Retry-After` header.

These are foundations; replace with Redis‑backed buckets and persisted complexity‑based costing in a later hardening pass.

