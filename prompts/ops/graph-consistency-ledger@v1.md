# Prompt: Graph Consistency Ledger Scaffold

## Objective

Implement the Postgres ↔ Neo4j graph consistency ledger scaffolding, including:
- scripts under `scripts/graph/` for snapshot, delta export, compare, and ledger writing
- documentation at `docs/GA_GRAPH_CONSISTENCY_LEDGER.md`
- workflow automation in `.github/workflows/graph-consistency.yml`
- supporting script wiring in `package.json`
- roadmap update in `docs/roadmap/STATUS.json`

## Constraints

- Keep all outputs append-only and deterministic.
- Use environment variables for secrets and database configuration.
- Emit JSON Lines artifacts for snapshot, deltas, comparison, and ledger output.
- Provide minimal unit tests for comparison logic.
- Avoid introducing schema-breaking changes.

## Verification Tiers

Tier C verification is required: run targeted script tests or validation steps and record the
results in the PR verification section.
