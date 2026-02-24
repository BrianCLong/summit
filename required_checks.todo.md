# Required checks discovery (TODO)

1) GitHub UI:
- Repo → Settings → Branches → Branch protection rules → note “Required status checks”.

2) GitHub API (if allowed):
- List branch protections and required checks.

## Known check names (Verified)
- CI Core Gate ✅
- gate
- Release Readiness Gate
- SOC Controls
- Unit Tests & Coverage

## Temporary names (Mapping needed)
We are using these names in our CI pipeline definitions, but they might be reported differently to GitHub:
- `gate/evidence` (PR2)
- `gate/supplychain` (PR4)
- `gate/fimi` (PR7)
- `sigstore-verify` (PR4)
- `switchboard-gates` (Lane 1)
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
