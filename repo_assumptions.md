# Repo Assumptions

## FactCert Location
- `FactLaw` and `FactMarkets` packages described in the requirements were not found in the file system.
- `FactCert` will be implemented as a new package in `packages/factcert`.
- This location aligns with the monorepo structure observed in `packages/`.

## Fixtures
- Fixtures will be stored in `fixtures/factcert/` to keep them separate from the source code but accessible for tests and CLI usage.

## CLI
- The CLI entry point will be structured within `packages/factcert/src/cli.ts` (to be implemented later).
- Execution will be via `pnpm` scripts defined in the root `package.json` or `packages/factcert/package.json`.

## Dependencies
- Using `node:crypto` for Ed25519 signing as per requirements.
- Using `vitest` for testing as it is already present in the root `package.json`.

## Must-Not-Touch
- `docs/ci/REQUIRED_CHECKS_POLICY.yml` (if it exists)
- Existing security scanning baselines.
