# Release Gates (Current Truth)

## Required Verification Layers

- **Tiered GA testing** (`docs/ga/TESTING-STRATEGY.md`):
  - Tier A: Jest lanes tagged `@ga-critical` where stable.
  - Tier B: Node-native verification (`testing/ga-verification/*.ga.test.mjs`).
  - Tier C: Policy/schema validation (`scripts/ga/verify-ga-surface.mjs`, `docs/ga/*.json`).
  - Command: `make ga-verify` (or direct node invocations) must succeed for GA-critical changes.
- **Legacy Mode limits** (`docs/ga/LEGACY-MODE.md`): new work cannot self-declare legacy; exemptions require issue ID, owner, and expiry; exit requires verification artifact.
- **Agent contract** (`agent-contract.json`):
  - Allowed zones: documentation and GA verification scripts only.
  - GA-critical work must cite Tier A/B/C evidence before merge; no Jest/pnpm global config changes without escalation.
  - CI enforcement: `scripts/ci/verify-prompt-integrity.ts` and `scripts/ci/validate-pr-metadata.ts` block PRs lacking registered prompts/metadata.

## CI-Enforced Gates

- **Golden Path**: `golden-path` and `reusable-golden-path.yml` require bootstrap + smoke tests; supply-chain variant builds attestations.
- **GA release lanes**: `ga-release.yml` and `release-ga.yml` run SLSA build and policy/compliance checks for GA tags.
- **Stability gates**: `mvp4-gate.yml`, `release-reliability.yml`, and `rc-lockdown.yml` must pass before RC/GA promotion.
- **Quality & security**: `pr-quality-gate.yml`, `ci-security.yml`, `secret-scan-warn.yml`, `graph-guardrail-fuzz.yml`, `unit-test-coverage.yml`, `web-accessibility.yml`, and schema compatibility workflows block regressions.

## How to Run Locally

1. **Environment setup**: align Node to `.nvmrc` (20.19.0) and enable `corepack pnpm@10.0.0`.
2. **Install**: `pnpm install --frozen-lockfile`.
3. **Smoke + lint**: `make bootstrap && make up && make smoke` (or `pnpm lint` + `pnpm test:quick` for fast validation).
4. **GA verification**: `make ga-verify` or `node --test testing/ga-verification/*.ga.test.mjs` plus `node scripts/ga/verify-ga-surface.mjs`.
5. **Release parity**: run targeted workflows locally where possible (`pnpm test`, `pnpm test:e2e`, `pnpm test:fuzz:graph-guardrails`); ensure PR metadata matches `.github/PULL_REQUEST_TEMPLATE.md` requirements.
