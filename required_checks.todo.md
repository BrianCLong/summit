# Required Checks Discovery (TODO)

## Goal
Identify the repo’s REQUIRED check names and map them to the temporary gates below.

## Temporary gate names used by this PR stack
- ci/psyche-policy-gate
- ci/evidence-schema-validate
- ci/no-pii-in-artifacts
- ci/dependency-delta

## How to discover required checks
1. Open a recent merged PR in the target repo.
2. Find the “Checks” section and note checks marked as “Required”.
3. Alternatively (GitHub): Settings → Branches → Branch protection rules → Required status checks.

## Rename plan
Once real names are known, add a tiny PR to rename the temporary gate labels in docs and CI config.
