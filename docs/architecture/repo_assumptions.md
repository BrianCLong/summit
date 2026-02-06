# Repo Assumptions: Adaptive Tradecraft Graph (ATG)

**Item slug:** `adaptive-tradecraft-graph`

## Verified-by-user

* Workflows exist: `.github/workflows/ci-pr.yml`, `ci-security.yml`, etc. (**Deferred pending validation**.)
* Datastores: Neo4j + vector (Qdrant) + Postgres + Redis. (**Deferred pending validation**.)

## Assumed paths

* `src/graphrag/...` exists and owns KG + retrieval integrations.
* `src/agents/...` exists and is the orchestration home.
* `tests/` exists with `pnpm test`, `pnpm test:e2e`.

## Must-not-touch list

* `.github/workflows/*` except adding *new* reusable gates.
* Existing connector implementations (only add new minimal adapters).

## Validation checklist (before merging PR1)

* Confirm actual graph store API surface (Neo4j driver wrapper? repository pattern?).
* Confirm event ingestion schema (current normalized event type(s), evidence IDs).
* Confirm CI check names (for required branch protection gates).

## Scope guardrails

* Defensive only. Simulation-first; enforcement mode remains feature-flagged **OFF**.
* Privacy/HR fusion remains policy-capsuled (no raw sensitive fields stored or logged).
* Determinism required for outputs; timestamps are intentionally constrained to fixture time.

## MAESTRO alignment

* **MAESTRO Layers**: Data, Agents, Tools, Security.
* **Threats Considered**: Prompt injection via ingested SaaS content, evidence tampering, tenant data bleed.
* **Mitigations**: Structured-only payloads, deterministic hashing + validation, tenant-scoped evidence IDs.
