# Repo Assumptions — Narrative IO Inference + Convergence

## Verified (registry-aligned, evidence-first)

- Workflows: `.github/workflows/*`
- Scripts: `.github/scripts/*`
- Policies: `.github/policies/*`
- Code: `src/api/*`, `src/agents/*`, `src/connectors/*`, `src/graphrag/*`
- Docs: `docs/architecture/*`, `docs/api/*`, `docs/security/*`

## Assumed (deferred pending validation)

- Narrative representation primitives (graph nodes vs embeddings vs topics) are present but need confirmation of canonical schema ownership.
- Evidence ledger or event model exists; scope and interfaces are deferred pending validation against repository sources.
- Test runner and golden fixture storage locations exist; exact paths are deferred pending validation against repo conventions.

## Must-Not-Touch Constraints (governed exceptions only)

- Existing CI core workflows (additive jobs only).
- Existing graph schema (extend, do not rewrite).
- Existing public API contracts (add endpoints behind feature flags).

## Validation Checklist (compressed feedback loop)

1. Locate narrative pipeline entrypoints (`src/agents/*` and `src/graphrag/*`).
2. Identify embedding store + similarity primitives (vector DB, cosine, ANN candidate gen).
3. Confirm taxonomy schema (frames, themes, stances) and evidence ledger boundaries.

## Authority Alignment

- Governance authority: `docs/governance/CONSTITUTION.md`.
- Readiness posture: `docs/SUMMIT_READINESS_ASSERTION.md`.

This document is intentionally constrained and evidence-first; all assumptions are treated as governed exceptions until validated.
