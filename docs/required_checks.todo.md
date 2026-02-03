# Required checks discovery (TODO)

## UI steps
1. GitHub UI → **Settings** → **Branches** → **Branch protection rules**.
2. Select the rule for `main` (or create one).
3. Enable **Require status checks to pass before merging**.
4. Record the exact check names as they appear in the UI.

## API steps
Use the GitHub API to list required checks:

```bash
gh api repos/:owner/:repo/branches/main/protection/required_status_checks
```

## Mapping table (temporary → actual)

| Temporary gate name | Actual required check name | Status |
| --- | --- | --- |
| gate:evidence_schemas_validate | TBD | assumed |
| gate:policy_deny_by_default | TBD | assumed |
| gate:budget_enforcement | TBD | assumed |
| gate:replay_harness_smoke | TBD | assumed |
| gate:evolve_requires_approval | TBD | assumed |

## Rename plan

Once the actual check names are discovered:
1. Update this mapping table with the exact names from GitHub.
2. Rename the gate names in workflows and docs to match the required checks.
3. Ship the rename as a tiny PR with no behavior changes.
