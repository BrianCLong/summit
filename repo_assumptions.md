# repo_assumptions.md

## Verified

- This subsumption bundle is generated without live repo inspection in this session.

## Assumed (validate ASAP)

- Node.js toolchain exists (pnpm/npm), scripts under `scripts/**`.
- CI runs GitHub Actions; required checks exist but names are unknown.
- Summit prefers deterministic evidence: separate report/metrics/stamp artifacts.

## Must-not-touch (until validated)

- Public API surfaces in `packages/**` (no breaking changes).
- Existing GA gates / branch protection requirements.
- Deployment configs / secrets / infra definitions.

## Validation plan

- Run `git ls-files` and confirm presence of `scripts/ci/**`, `docs/**`, `evidence/**`.
- Enumerate required checks via GitHub branch protection UI/API.
- Confirm test runner (jest/vitest) and lint tooling.
