# ATSH QA Harness Scaffold

This scaffold tracks the `feat/atsh` branch and the `feature:ATSH_ENABLED` label. It defines the structure for the Autonomous Triage Safety Harness QA lane while keeping the feature flag off for `main`.

## Layout
- `contracts/`: typed request/response definitions for ATSH harness entrypoints.
- `fixtures/`: sanitized, PII-free datasets and deterministic seeds for reproducible runs.
- `tests/`: unit, policy/contract, and Playwright smoke coverage aligned with the feature-flag CI workflow.
- `docs/`: guardrail notes, schema snapshots, and runbooks for preview environment expectations.

## CI & Feature Flags
- The feature branch workflow `.github/workflows/feature-flag-branches.yml` runs lint → unit → policy/contract → Playwright for ATSH.
- `ATSH_ENABLED` is exported in CI; assertions should verify the flag is respected before invoking harness effects.
- Preview environments should publish URLs in PR comments and rely on `auto-rollback.yml` when gates fail.

## Governance
- No shared databases; rely on ephemeral stores or mocks. Typed boundaries are required for any integrations.
- Redact PII in all fixtures/logs. Document seeds and rerun guidance to keep executions deterministic.
