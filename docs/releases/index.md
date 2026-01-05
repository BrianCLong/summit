# Release Bundle Artifacts Index

This index provides quick access to all release-related artifacts, scripts, workflows, and documentation.

## Workflows

- [.github/workflows/release-ga.yml](../../.github/workflows/release-ga.yml)

## Scripts

- [scripts/release/preflight-release.mjs](../../scripts/release/preflight-release.mjs)
- [scripts/release/check-freeze.mjs](../../scripts/release/check-freeze.mjs)
- [scripts/release/find-prev-tag.mjs](../../scripts/release/find-prev-tag.mjs)
- [scripts/release/generate-release-notes.mjs](../../scripts/release/generate-release-notes.mjs)
- [scripts/release/verify-release-bundle.mjs](../../scripts/release/verify-release-bundle.mjs)
- [scripts/release/build-release-status.mjs](../../scripts/release/build-release-status.mjs)
- [scripts/release/release-bundle.mjs](../../scripts/release/release-bundle.mjs)

## Schemas / Contracts

- [docs/releases/status-schema.md](status-schema.md)

## Operator Docs

- [docs/releases/runbook.md](runbook.md)

## Policy

- [policy/release.rego](../../policy/release.rego)

## How to run locally

- `pnpm test:release-scripts`
- `pnpm lint:release-policy`
- `pnpm release:bundle -- --tag vX.Y.Z-rc.1`
- `pnpm release:verify`
