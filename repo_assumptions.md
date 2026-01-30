# repo_assumptions.md

## Verified

- Repository contents inspected locally; subsumption bundles and verifier script exist.
- CI uses GitHub Actions workflows under `.github/workflows/`.
- Evidence schemas and index live under `evidence/`.

## Assumed (validate ASAP)

- Required status check names remain to be confirmed against branch protection.
- Summit prefers deterministic evidence: separate report/metrics/stamp artifacts.

## Must-not-touch (until validated)

- Public API surfaces in `packages/**` (no breaking changes).
- Existing GA gates / branch protection requirements.
- Deployment configs / secrets / infra definitions.

## Validation plan

- Enumerate required checks via GitHub branch protection UI/API.
- Confirm test runner (jest/vitest) and lint tooling.
