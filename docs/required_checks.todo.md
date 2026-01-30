# Required Checks Discovery (TODO)

## Goal

Produce the exact list of required check contexts for branch protection.

## Option A — GitHub UI

1. Repo → Settings → Branches → Branch protection rules → main.
2. Copy the "Require status checks to pass before merging" list exactly.

## Option B — GitHub REST API

1. Fetch protection:
   - `GET /repos/{owner}/{repo}/branches/main/protection`
2. Record:
   - `required_status_checks.contexts` (array of strings)
   - `required_status_checks.strict` (boolean)

## Option C — GitHub CLI

1. `gh api /repos/{owner}/{repo}/branches/main/protection --jq '.required_status_checks.contexts'`

## Output

Update these files with the discovered contexts:

- `.github/governance/branch_protection_rules.json`
- `subsumption/branch-protection-as-code/manifest.yaml`
