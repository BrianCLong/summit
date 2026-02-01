# Required Checks Discovery

## Process to Identify Required Checks

1. Go to repository Settings in GitHub.
2. Navigate to **Branches** -> **Branch protection rules**.
3. Edit the rule for `main` (or default branch).
4. Look for "Require status checks to pass before merging".
5. Copy the exact names of the required checks listed there.

## Temporary Gate Names (Implemented)

We are using these names in our CI pipelines until the official required check names are confirmed and mapped.

- `summit-ci/evidence-verify`: Validates evidence artifacts (schemas, determinism).
- `summit-ci/prompt-determinism`: Verifies prompt construction determinism.
- `summit-ci/tool-schema-drift`: Checks for MCP tool schema drift.
- `summit-ci/policy-gates`: Enforces policy gates (dep delta, compaction invariants).
- `summit-ci/unit`: Runs unit tests.

## Rename Plan

Once official names are known, we will alias these jobs or rename them in the workflow files to match the branch protection rules.
