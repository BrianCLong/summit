# Required checks discovery (TODO)

Goal: enumerate the exact required CI checks for the default branch and record them in CI documentation.

## Steps (GitHub UI)
1. Repo Settings → Branches → Branch protection rules.
2. Locate rule for default branch.
3. Copy the list under "Require status checks to pass before merging".

## Steps (GitHub API)
- Use the Branch Protection endpoint for the default branch and read `required_status_checks.contexts`.

## Output
- Create `ci/required_checks.json` listing:
  - check_name
  - owner (workflow/file)
  - lane (L1/L2)
  - enforcement (required/optional)

## Temporary convention (until discovered)
- `ci:verify-evidence`
- `tests:unit`
