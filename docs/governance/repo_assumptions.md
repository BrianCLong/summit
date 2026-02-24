# Repo Assumptions: Narrative IO Inference & Convergence

## Verified
- Workflows: `.github/workflows/*`
- Scripts: `.github/scripts/*` (Note: scripts/ directory used instead)
- Policies: `.github/policies/*` (Note: policies/ directory used instead)
- Code: `src/api/*`, `src/agents/*`, `src/connectors/*`, `src/graphrag/*` (Note: `src/narrative` added)
- Docs: `docs/architecture/*`, `docs/api/*`, `docs/security/*`

## Assumed & Validated
- Narrative representation: Graph nodes + embeddings (confirmed by `src/narrative` structure).
- Evidence ledger: `summit_evidence` or `evidence/` directory exists.
- Test runner: `jest` (verified).
- Fixtures: `tests/narrative/fixtures` (verified).

## Validation Checklist
- [x] Locate narrative pipeline entrypoints (`src/agents/*` and `src/graphrag/*`)
- [x] Identify embedding store + similarity primitives (vector DB, cosine, etc.)
- [x] Confirm any existing taxonomy schema (e.g., frames, themes, stances)
