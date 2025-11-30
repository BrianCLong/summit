# Saga Orchestration Scaffold

This scaffold supports the `feat/saga` branch under the `feature:SAGA_ENABLED` label. It outlines deterministic saga orchestration work without allowing shared transactional databases.

## Layout
- `contracts/`: typed command/event schemas, compensation contracts, and versioned change logs.
- `fixtures/`: seeded message/queue datasets for deterministic replay and failure drills.
- `tests/`: unit and contract suites plus Playwright smoke paths for happy-path and rollback scenarios.
- `docs/`: guidance on choreography vs orchestration, idempotency keys, and isolation expectations.

## CI & Feature Flags
- `.github/workflows/feature-flag-branches.yml` runs lint, unit, policy/contract, and Playwright gates with `SAGA_ENABLED=true` on the feature branch.
- Preview environments should surface saga endpoints with the flag on; `auto-rollback.yml` must be available when gates fail.

## Governance
- Enforce typed boundaries and avoid shared DBs between services participating in the saga.
- Capture redaction policies for any payloads in fixtures and telemetry; document seeds to keep runs reproducible.
