## Discover required checks (GitHub UI)
1. Open repo → Settings → Branches → Branch protection rule.
2. List required status checks (exact names).

## Discover via API
1. Use GitHub REST: Get branch protection for default branch.
2. Record required checks; paste into `tools/ci/required_checks.json`.

## Temporary gate names (until discovered)
- ci/privacy-graph-gate
- ci/deps-delta-gate
