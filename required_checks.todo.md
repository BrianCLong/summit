# Required Checks Todo List

This file tracks the status of CI check discovery and alignment with branch protection rules.

## Discovery Steps

1. Go to repository **Settings** in GitHub.
2. Navigate to **Branches** -> **Branch protection rules**.
3. Edit the rule for `main` (or default branch).
4. Look for **"Require status checks to pass before merging"**.
5. Copy the exact names of the required checks listed there.
6. Alternatively, use the GitHub API: `GET /repos/{owner}/{repo}/branches/{branch}/protection` and map `required_status_checks.contexts`.

## Current status
GitHub Actions currently executes many checks, but we need to verify their exact names as reported to the GitHub Status API to ensure our "Always Required" and "Conditional Required" policies match exactly what GitHub expects.

## Known check names (Verify these)
- CI Core (Primary Gate) / CI Core Gate ✅
- CI / Unit Tests
- GA Gate
- Release Readiness Gate
- SOC Controls
- Unit Tests & Coverage

## Temporary CI Names (Requiring Mapping)
We are using these names in current CI, but they might be reported differently to GitHub:
- `ci:unit` (or `test`)
- `ci:lint` (or `lint`)
- `ci:evidence`
- `ci:security-gates`
- `verify:dependency-delta`
- `tmp_gate_feature_flags_off`
- `typecheck`
- `build`

## Rename Plan
Once official names are known, we will alias these jobs or rename them in the workflow files to match the branch protection rules.

## Temporary gates (Summit Harness & Skills)
- ci/summit-harness-evidence
- ci/summit-tool-policy
- Use `skills/*` jobs with stable names (If actual required checks differ, add a rename PR that preserves history).
- summit-skillsec
- summit-evidence
- summit-harness-mock