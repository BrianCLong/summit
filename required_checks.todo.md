<<<<<<< HEAD
# Required checks discovery (SlopGuard)

The following CI gates are planned for SlopGuard. These should be mapped to real CI check names once discovered in the repo settings.

1. `slopguard_policy`: Evaluates artifact against SlopGuard policy.
2. `slopguard_citations`: Validates citations in research artifacts.
3. `dataset_hygiene`: Ensures dataset provenance tags are present.

## TODO
- [ ] Verify branch protection rules for required check names.
- [ ] Integrate SlopGuard CLI into the CI pipeline.
- [ ] Rename temporary gate names to match repository standards.
=======
# Required Checks Todo List

This file tracks the status of CI check discovery and alignment with branch protection rules.

## Current status
GitHub Actions currently executes many checks, but we need to verify their exact names as reported to the GitHub Status API to ensure our "Always Required" and "Conditional Required" policies match exactly what GitHub expects.

## Known check names (Verify these)
- CI Core (Primary Gate) / CI Core Gate ✅
- CI / Unit Tests
- GA Gate
- Release Readiness Gate
- SOC Controls
- Unit Tests & Coverage

## Temporary names (Mapping needed)
We are using these names in our CI pipeline definitions, but they might be reported differently to GitHub:
- `lint`
- `typecheck`
- `build`
- `test`

Once official names are known, we will alias these jobs or rename them in the workflow files to match the branch protection rules.

## Temporary gates (Summit Harness & Skills)
- ci/summit-harness-evidence
- ci/summit-tool-policy
- Use `skills/*` jobs with stable names (If actual required checks differ, add a rename PR that preserves history).
- summit-skillsec
- summit-evidence
- summit-harness-mock

## Required checks discovery (one-time for Memory Privacy)
1) GitHub UI: Repo → Settings → Branches → Branch protection rules → note required checks
2) GitHub API: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
3) Update: ci/gates/memory_privacy_gates.yml to match exact check names
4) Add PR to rename temporary checks to required names once known
>>>>>>> origin/main
