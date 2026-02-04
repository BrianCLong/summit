# Required Checks Discovery

## Process to Identify Required Checks

1. Go to repository Settings in GitHub.
2. Navigate to **Branches** -> **Branch protection rules**.
3. Edit the rule for `main` (or default branch).
4. Look for "Require status checks to pass before merging".
5. Copy the exact names of the required checks listed there.

## Temporary Gate Names (Implemented in Plan)

We are using these names in our CI pipelines until the official required check names are confirmed and mapped.

- `ci:unit` - Runs unit tests for new packages.
- `ci:lint` - Runs linting.
- `ci:evidence` - Validates evidence artifacts (schemas, determinism).
- `ci:security-gates` - Runs deny-by-default and redaction tests.
- `verify:dependency-delta` - Ensures dependency changes are documented.
- `ci/prompt-registry-immutability` - Ensures prompt version files are immutable.
- `ci/prompt-eval-gate` - Ensures prompts pass evaluations before promotion.

## Rename Plan

Once official names are known, we will alias these jobs or rename them in the workflow files to match the branch protection rules.
