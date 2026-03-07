# Required Checks Discovery TODO

1. Open repository settings.
2. Navigate to **Settings → Branches → Branch protection rules**.
3. Record exact required status checks for the target branch.
4. Align workflow job names with required checks list.

## Initial mapping candidates

- `policy/dependency-delta / dependency-delta`
- Existing quality gate jobs from `.github/workflows/pr-quality-gate.yml`

## Follow-up action

If required check names and workflow job names diverge, update workflow `name` and job IDs in a dedicated alignment PR.
