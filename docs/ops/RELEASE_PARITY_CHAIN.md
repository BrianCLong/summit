# Release Parity Chain

This document defines the canonical chain of commands that constitute a "Release Assurance" check. These commands replicate the gates enforced by the Continuous Integration (CI) pipeline.

## Canonical Chain

The following steps must pass for a release to be considered viable.

| Order | Stage | Command | Scope |
|-------|-------|---------|-------|
| 1 | **Install** | `pnpm install --frozen-lockfile` | Repository Root |
| 2 | **Lint** | `pnpm -w run lint` | Repository Root |
| 3 | **Typecheck** | `pnpm -w run typecheck` | Repository Root |
| 4 | **Build** | `pnpm -w run build` | Repository Root |
| 5 | **Test** | `pnpm -w run test` | Repository Root |
| 6 | **Policy** | `pnpm run test:policy` | Repository Root |
| 7 | **Prod Guard** | `npx tsx scripts/ci/prod-config-check.ts` | Repository Root |

> **Note:** The `Prod Guard` step is referenced in CI workflows as `pnpm ci:prod-guard`, but the script alias is currently missing from `package.json`. The canonical command above invokes the underlying script directly.

## Workflow Reference

These steps are derived from:
- `.github/workflows/reusable/contract.yml`
- `.github/workflows/reusable/unit.yml`
- `.github/workflows/reusable/build-test.yml`
- `.github/workflows/reusable/smoke.yml`

## Environment Requirements

- **Node.js**: >=18.18
- **pnpm**: >=10.0.0
- **Docker**: Required for smoke tests (not included in standard preflight due to weight)

## Execution

To execute the full chain (excluding smoke tests) with evidence collection, use the Release Preflight tool:

```bash
pnpm release:preflight
```
