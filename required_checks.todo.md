# Required Checks Discovery (TODO)

## Process to Identify Required Checks

1. Go to repository Settings in GitHub.
2. Navigate to **Branches** -> **Branch protection rules**.
3. Edit the rule for `main` (or default branch).
4. Look for "Require status checks to pass before merging".
5. Copy the exact names of the required checks listed there.

## UI
1. Repo Settings → Branches → Branch protection rules.
2. Note all "Require status checks" names for the default branch.

## API (GitHub)
- REST: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
- GraphQL: query branchProtectionRules + requiredStatusChecks

## Temporary naming convention
- Use `skills/*` jobs with stable names.
- If actual required checks differ, add a rename PR that preserves history.

## Temporary Gate Names (Implemented in Plan)

We are using these names in our CI pipelines until the official required check names are confirmed and mapped.

- `ci:unit` - Runs unit tests for new packages.
- `ci:lint` - Runs linting.
- `ci:evidence` - Validates evidence artifacts (schemas, determinism).
- `ci:security-gates` - Runs deny-by-default and redaction tests.
- `verify:dependency-delta` - Ensures dependency changes are documented.

## Rename Plan

Once official names are known, we will alias these jobs or rename them in the workflow files to match the branch protection rules.
