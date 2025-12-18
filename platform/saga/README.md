# Saga Orchestration Scaffold

Feature flag: `FEATURE_SAGA_ENABLED`
Branch: `feat/saga`

## Purpose
- Implement saga-based orchestration with explicit compensating actions and typed event/command schemas.
- Maintain isolation across services with no shared databases; rely on message contracts and idempotent handlers.

## Implementation Notes
- Document forward/compensation steps and state transitions with deterministic replay fixtures.
- Capture metrics/traces with redaction for sensitive fields before emission.
- Provide contract tests for saga boundaries and enforce feature flag gating across UX and API layers.

## CI Expectations
- Lint: `pnpm run lint`
- Unit: `pnpm run test:unit`
- Contract: `pnpm run test:policy`
- Playwright: `pnpm run e2e` (flag-aware flows)
- Preview smoke: `bash scripts/preview-local.sh help`
- Rollback validation: `bash scripts/validate-rollback.sh --help`

## Rollout
- Keep `FEATURE_SAGA_ENABLED` default OFF; enable per-environment after preview validation.
- Document rollout/rollback steps in the PR and link to preview environment details.
