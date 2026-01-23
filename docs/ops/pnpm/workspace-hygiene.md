# PNPM Workspace Hygiene Ground Truth

Reference: `docs/SUMMIT_READINESS_ASSERTION.md` governs readiness posture.

## Versions

- Node.js: 20.19.0 (from `.nvmrc` and `.node-version`; engines allow >=18.18)
- pnpm: 10.0.0 (from `package.json` `packageManager`)

## Canonical Commands (repo root)

- Install (CI): `pnpm install --frozen-lockfile`
- Install (local): `pnpm install`
- Build: `pnpm build`

## Known Local Install Blocker

`pnpm install --frozen-lockfile` currently fails at `postinstall` with:

- `Error: Cannot find module scripts/patch-strip-ansi.cjs`

This is expected to be resolved by PR #16620.

