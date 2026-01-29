# Required Checks Discovery (TODO)

1. Open repo settings → Branch protection rules.
2. Record required status check names for default branch.
3. Paste them into `ci/required_checks.json` (to be added in PR7).
4. If names differ from our local gates, add a rename map.

Current Assumed Checks:
- `check:lint`
- `check:unit`
- `check:security`
- `check:evidence-validate`
- `check:dep-delta`
