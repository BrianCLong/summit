# Prompt Registry Scaffold

Feature flag: `FEATURE_PROMPT_REGISTRY_ENABLED`
Branch: `feat/prompt-registry`

## Purpose
- Govern the lifecycle of prompts with typed schemas, auditability, and rollout controls.
- Provide isolated registry storage/adapters with no shared databases and event-driven integrations.

## Implementation Notes
- Define typed prompt metadata, versioning, and lineage; emit events for publish/retire actions.
- Redact PII/SPI in stored prompts, logs, and telemetry; enable governance checks in CI.
- Supply deterministic fixtures for prompt samples and agent behaviors to keep tests reproducible.

## CI Expectations
- Lint: `pnpm run lint`
- Unit: `pnpm run test:unit` (seeded fixtures)
- Contract: `pnpm run test:policy`
- Playwright: `pnpm run e2e` (flag-aware registry flows)
- Preview smoke: `bash scripts/preview-local.sh help`
- Rollback validation: `bash scripts/validate-rollback.sh --help`

## Rollout
- Keep `FEATURE_PROMPT_REGISTRY_ENABLED` default OFF until governance sign-off.
- Capture preview environment link, rollback hooks, and feature-flag diff in the PR using the repo template.
