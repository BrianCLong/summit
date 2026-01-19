# Graph Sync Validator v0 Scaffold

## Objective
Deliver a repo-ready scaffold for a graph parity validator that audits Postgres vs Neo4j, emits drift reports, supports controlled repair planning, and includes a CI parity gate workflow.

## Scope
- Create the `packages/graph-sync-validator` workspace package with config, loaders, diff/repair/reporting modules, CLI entrypoint, and tests.
- Add a GitHub Actions workflow to run parity audits and publish artifacts.
- Update `docs/roadmap/STATUS.json` with a revision note and timestamp.

## Constraints
- Read-only audit path by default; repairs are gated behind explicit allowlist flags.
- Deterministic normalization and parity calculation across nodes and edges.
- Provide JSONL/JUnit/text outputs suitable for CI artifacts and evidence.

## Acceptance Criteria
- `graph-sync:audit` builds and emits artifacts with parity gating behavior.
- Unit tests cover diff and repair planning logic without placeholders.
- Workflow uploads parity artifacts and fails when parity is below threshold.
