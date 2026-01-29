# Required Checks Discovery (TODO) — azure-turin-v7

## Goal
Identify the exact required check names enforced by branch protection for `main` (Golden Path).

## UI steps (fast)
1. Repo → Settings → Branches → Branch protection rules → rule for `main`.
2. Under “Require status checks”, copy exact check names (case-sensitive).

## API steps (authoritative)
1. `gh api repos/:owner/:repo/branches/main/protection --jq '.required_status_checks.contexts'`
2. Store output in `subsumption/azure-turin-v7/required_checks.json` (stable ordering).

## Temporary convention (until verified)
- Add new check named: `subsumption-bundle-verifier`
- If the repo uses a prefix, rename in PR-02 after discovery.

## Rename plan
- If discovered required checks include an existing evidence verifier, align job name to match.
