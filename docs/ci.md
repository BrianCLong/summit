# CI Overview

Summit CI enforces governance, security, and quality gates aligned with the Summit Readiness Assertion.

## Key Workflows

- `pr-quality-gate.yml`: Primary PR gate, required checks and evidence validation.
- `ci-health.yml`: Meta health gate for lint, typecheck, unit, integration, and security dashboard alerts.
- `ci-security.yml`: CodeQL, SAST, and supply-chain checks.
- `golden-path-e2e.yml`: Golden Path end-to-end validation.
- `ci-preflight.yml`: Early signal checks for fast feedback.

## Local Parity Commands

Run these locally to mirror CI behavior:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
make smoke
```

## Evidence & Governance

- Evidence bundle requirements are defined in `docs/evidence-bundle-spec.md`.
- Prompt integrity and governance gates are enforced in `scripts/ci/verify-prompt-integrity.ts` and `scripts/ci/validate-pr-metadata.ts`.
- Security dashboard alert thresholds are enforced via `scripts/ci/collect_security_metrics.mjs`.
