# Required Checks Discovery (TODO)

## Goal

Discover the exact required check names enforced by branch protection for the default branch.

## Option A — GitHub UI

1. Repo → Settings → Branches → Branch protection rules.
2. Open rule for default branch.
3. Copy the list under “Require status checks to pass”.
4. Paste into `docs/required_checks.verified.md` (new file) as a bullet list.

## Option B — GitHub API

Use REST:

- `GET /repos/{owner}/{repo}/branches/{branch}/protection`
  Then extract:
- `required_status_checks.contexts`
- `required_status_checks.checks[].context` (if present)

## Temporary Convention (until verified)

- New gate job name: `verify-subsumption-bundle`
  Rename plan:
- If actual naming conventions differ, create PR to rename the job to match existing required-check patterns.
