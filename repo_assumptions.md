# Repo Assumptions — narrative-ops-detection-2026-01-28

## Verified (conversation-context only)
- Summit uses deterministic evidence artifacts: report.json / metrics.json / stamp.json separation.
- Summit has CI scripts under scripts/ci and governance gates used for GA readiness.
- Branch protection + required checks enforcement is a known active effort.

## Assumed (must validate)
- Node.js >= 20 and pnpm available for running scripts/ci/*.mjs.
- A test runner exists (jest/vitest/node:test). If absent, use node:test.
- Repo accepts new directories: subsumption/, evidence/, docs/.

## Must-not-touch
- Production runtime codepaths unrelated to subsumption bundle.
- Existing CI/gov scripts unless strictly additive.
- Branch protection settings (until required-check discovery completes).

## Validation Plan
- Run required check discovery steps in required_checks.todo.md.
- Confirm test runner via package.json.
- Confirm repo conventions for evidence index location and CI workflow naming.
