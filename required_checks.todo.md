# Required Checks Todo

## Inspection Steps
1. Inspect branch protection rules for `main`.
2. Identify required status checks.

## Temporary Check Names
The following checks are expected to be required for `cog_resilience` integration:

- `ci/summit-evidence`
- `ci/summit-cog-policy`
- `ci/summit-cog-evals`
- `ci/supply-chain-delta`

## Rename Plan
Once the actual required check names are confirmed from branch protection settings, rename these temporary checks in the CI workflows to match.
