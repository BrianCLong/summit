# Required Checks Discovery

## Process to Identify Required Checks

### UI Steps
1. Go to repository Settings in GitHub.
2. Navigate to **Branches** -> **Branch protection rules**.
3. Edit the rule for `main` (or default branch).
4. Look for "Require status checks to pass before merging".
5. Copy the exact names of the required checks listed there.

### API Steps
Run the following to list checks for the current branch:
```bash
gh api repos/:owner/:repo/commits/$(git rev-parse HEAD)/check-runs --jq '.check_runs[].name'
```

## Temporary Gate Names (Implemented in Plan)

We are using these names in our CI pipelines until the official required check names are confirmed and mapped.

- `ci/summit-gates` (Consolidated validation job)
  - Replaces/consolidates: `ci:evidence`, `ci:security-gates`
- `verify:dependency-delta` - Ensures dependency changes are documented.

## Rename Plan

Once official names are known, we will alias these jobs or rename them in the workflow files to match the branch protection rules.
