# Required Checks Discovery

## Process to Identify Required Checks

1. Go to repository Settings in GitHub.
2. Navigate to **Branches** -> **Branch protection rules**.
3. Edit the rule for `main` (or default branch).
4. Look for "Require status checks to pass before merging".
5. Copy the exact names of the required checks listed there.

## Temporary Gate Names (Implemented in Plan)

We are using these names in our CI pipelines until the official required check names are confirmed and mapped.

- `gate:evidence_schema` - Validates evidence artifacts (schemas, determinism).
- `gate:policy_deny_default` - Runs deny-by-default and redaction tests.
- `gate:dependency_delta` - Ensures dependency changes are documented.
- `gate:determinism` - Ensures no timestamps outside stamp.json.

## Rename Plan

Once official names are known, we will alias these jobs or rename them in the workflow files to match the branch protection rules.
