# ATSH Safety Harness

Feature flag: `FEATURE_ATSH_ENABLED`
Branch: `feat/atsh`

## Purpose
- Provide a deterministic anti-tamper QA harness for safety regression packs.
- Enforce typed event ingress/egress boundaries with no shared databases.

## Implementation Notes
- Harness orchestration must run behind the ATSH flag and expose typed contracts for inputs/outputs.
- Logs and artifacts require PII/SPI redaction; disable recordings when redaction is uncertain.
- Seed all fixtures for reproducibility; add contract tests for ingress schemas and guardrail rehearsal flows.

## CI Expectations
- Lint: `pnpm run lint`
- Unit: `pnpm run test:unit` (seeded)
- Contract: `pnpm run test:policy`
- Playwright: `pnpm run e2e` (flag-aware flows)
- Preview smoke: `bash scripts/preview-local.sh help`
- Rollback validation: `bash scripts/validate-rollback.sh --help`

## Rollout
- Keep `FEATURE_ATSH_ENABLED` default OFF; enable per-environment after CI + preview validation passes.
- Capture preview environment URL and rollback plan in the PR using the repo template.
