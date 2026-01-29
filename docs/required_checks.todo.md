# Required Checks Discovery (TODO)

## Option A: GitHub UI
1. Repo → Settings → Branches → Branch protection rule for default branch
2. Note exact names under “Require status checks to pass”
3. Paste into `subsumption/_global/required_checks.json`

## Option B: GitHub API
- Use: GET /repos/{owner}/{repo}/branches/{branch}/protection
- Record `required_status_checks.contexts`

## Temporary Convention (until verified)
- `subsumption-bundle-verify`
- `subsumption-bundle-evals`

## Rename Plan
- If actual required checks differ: add mapping file + update workflow job name(s) in a follow-up PR.
