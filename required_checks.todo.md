# Required Checks Discovery (TODO)

## Goal
List the repository's *required* CI checks for the default branch, then map them to verifier names
in `ci/verifiers/`.

## GitHub UI steps
1. Go to Repo → Settings → Branches → Branch protection rules.
2. Open the rule for the default branch (usually `main` or `master`).
3. Scroll to “Require status checks to pass”.
4. Copy the exact names of all checked items in the list.

## GitHub API steps
Use the Branch Protection API to fetch required status checks for the branch:

```bash
# Replace OWNER, REPO, and BRANCH with actual values
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/branches/BRANCH/protection/required_status_checks
```

Look for the `contexts` array in the response.

## Temporary Convention
Until discovered, we use temporary gate IDs defined in `summit/policy_gates/gates.toml`:
- `gate:evidence-schema-validate`
- `gate:eval-harness-smoke`
- `gate:redaction-neverlog`
- `gate:determinism-fixtures`
- `gate:featureflag-off-default`

## Rename Plan
Once real check names are known:
1. Update `summit/policy_gates/gates.toml` to map temporary gates to real check names.
2. Update CI config to emit the official check names if needed.
3. Add a PR that renames verifiers and keeps backward-compat aliases for one week.
