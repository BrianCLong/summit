# Claude Obsidian PR1 — Evidence Scaffold

## Objective
Scaffold the Claude-in-Obsidian evidence bundle contract, verifier, and GA mapping for Summit.

## Required Outputs
- Evidence bundle schemas (`evidence/schemas/report.schema.json`, `metrics.schema.json`, `stamp.schema.json`).
- Evidence bundles under `evidence/bundles/` with deterministic IDs and no timestamps outside `stamp.json`.
- Global evidence index updates in `evidence/index.json`.
- Evidence verifier CLI at `.github/scripts/evidence-verify.mjs` plus unit tests.
- GA documentation for the evidence system and verification mapping updates.
- Required checks discovery update in `required_checks.todo.md`.
- Roadmap status update in `docs/roadmap/STATUS.json`.
- DecisionLedger entry with rollback guidance in `packages/decision-ledger/decision_ledger.json`.

## Guardrails
- Deny-by-default: fail if `write_enabled` is true in evidence reports unless explicitly allowed.
- Determinism: timestamps only in `stamp.json`; no random IDs.
- Do not modify global Jest/pnpm configuration.
- Keep changes scoped to evidence scaffolding and GA verification docs.

## Verification
- Run `make ga-verify`.
- Run `node .github/scripts/evidence-verify.mjs`.
- Run `node scripts/check-boundaries.cjs`.
