# MVP-4 GA — v4.0.4

Release codename: Ironclad Standard

## Highlights

- GA gating and smoke verification are codified as first-class make targets for consistent release verification. (Evidence: `Makefile` targets `ga` and `smoke`, plus `docs/release/GA_CHECKLIST.md`.)
- Release evidence is centralized with a dedicated evidence index and readiness report for verifiable sign-off. (Evidence: `docs/release/GA_EVIDENCE_INDEX.md`, `docs/release/GA_READINESS_REPORT.md`.)
- Release bundle generation and verification scripts exist with automated tests for error handling. (Evidence: `scripts/release/release-bundle.mjs`, `scripts/release/verify-release-bundle.mjs`, `scripts/release/__tests__/error-handling.test.mjs`; command: `npm run test:release-scripts`.)
- Operational rollback is defined, documented, and callable via a make target that wraps the rollback script. (Evidence: `docs/releases/v4.0.0/MVP4-GA-ROLLBACK.md`, `Makefile` target `rollback`, `scripts/rollback.sh`.)
- SBOM and provenance generation are supported by dedicated compliance scripts. (Evidence: `package.json` scripts `generate:sbom`, `generate:provenance`; `docs/releases/runbook.md`.)

## What shipped

### Product

- Local stack entrypoints and smoke checks for the UI and Gateway health endpoints. (Evidence: `Makefile` targets `dev-up` and `dev-smoke`.)

### Platform

- Standardized GA gates and golden path automation via `make ga`, `make smoke`, and `make ci`. (Evidence: `Makefile`.)
- Release bundle build and verification tooling with a dry-run workflow path. (Evidence: `scripts/release/release-bundle.mjs`, `scripts/release/verify-release-bundle.mjs`, `scripts/release/dry_run_release.sh`.)

### Security and Governance

- Governance and living-document verification scripts are available as explicit GA steps. (Evidence: `package.json` scripts `verify:governance`, `verify:living-documents`; `docs/release/GA_CHECKLIST.md`.)
- Provenance generation is supported through a CI script path. (Evidence: `Makefile` target `provenance`.)

### Ops and DevEx

- Release runbook and GA checklists formalize release operations and evidence capture. (Evidence: `docs/releases/runbook.md`, `docs/release/GA_CHECKLIST.md`, `docs/release/GA_EVIDENCE_INDEX.md`.)
- Rollback protocol and drills are defined for operator practice. (Evidence: `docs/releases/v4.0.0/MVP4-GA-ROLLBACK.md`, `Makefile` targets `rollback` and `rollback-drill`.)

## Breaking changes

None evidenced in the repository for this release. Migration steps are intentionally constrained pending a declared breaking-change list.

## How to run

```bash
make bootstrap
cp .env.example .env
make up
```

## How to verify

```bash
make smoke
make ga
npm run test:release-scripts
npm run verify:governance
npm run verify:living-documents
npm run generate:sbom
npm run generate:provenance
```

Also review `docs/SUMMIT_READINESS_ASSERTION.md` as part of the GA assertion packet.

## Known limitations

- Load testing evidence is deferred pending a `k6`-enabled environment. (Evidence: `docs/releases/v4.0.0/MVP4-GA-READINESS.md`.)
- GA readiness report requires a full CI rerun and security scan evidence before sign-off. (Evidence: `docs/release/GA_READINESS_REPORT.md`.)

## Verification summary (restricted profile)

Verified under `CI=1 ZERO_FOOTPRINT=true NO_NETWORK_LISTEN=true`:

- GA evidence map and keyword scoping via `node --test testing/ga-verification/ga-features.ga.test.mjs`.
- GA surface policy preflight via `node scripts/ga/verify-ga-surface.mjs`.
- Accessibility gate wiring via file presence checks: `e2e/a11y-keyboard/a11y-gate.spec.ts` and `.github/workflows/a11y-keyboard-smoke.yml`.

Deferred pending verification:

- `pnpm run test:a11y-gate` (Playwright runtime required).
- `make ga-verify` (full GA gate context required).

## Credits

Release Captain: Jules. (Evidence: `docs/releases/v4.0.0/MVP4-GA-Readiness-Package.md`.)
