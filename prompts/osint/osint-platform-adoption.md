# Prompt: OSINT Platform Adoption → Summit Workbench, Connectors, Replay

You are executing the OSINT adoption task for Summit. Deliver deterministic, governance-aligned
artifacts that map external OSINT platform capabilities into Summit’s architecture.

## Required Outputs

1. Investigation Workbench spec (browser-first, deterministic replay).
2. Connector architecture with strict provenance metadata.
3. Monitor + replay pipeline with deterministic JSONL bundles.
4. CI determinism gate to prevent timestamp leakage and unstable ordering.
5. Tests for determinism, replay filtering, and provenance completeness.

## Constraints

- Deterministic outputs only: no network calls, no nondeterministic timestamps in replay artifacts.
- Fixtures must live under `test/fixtures/`.
- All provenance metadata must be complete and auditable.
- Update `docs/roadmap/STATUS.json` in the same PR.

## Deliverables

- `docs/osint/investigation-workbench.md`
- `docs/osint/connector-architecture.md`
- `packages/osint-replay/*`
- `scripts/ci/verify_case_replay_determinism.mjs`
- Unit tests for determinism + replay filtering
