# Required Checks Discovery

## UI Steps
1. Go to repository Settings -> Branches.
2. Check branch protection rules for `main`.
3. Note the list of "Require status checks to pass before merging".

## API Steps
1. Use `gh api repos/:owner/:repo/branches/main/protection` to list required checks programmatically.
2. Cross-reference these names with `ci/gates/` definitions.

## Plan
1. Once checks are discovered, rename temporary check names in CI config to match required names.
2. Ensure no gaps between required checks and actual CI jobs.
