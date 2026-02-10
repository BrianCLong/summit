# Required checks discovery (TODO)

## Goal
List the repository's *required* CI checks for the default branch, then map them to verifier names
in `ci/verifiers/`.

## GitHub UI steps
1. Repo → Settings → Branches → Branch protection rules.
2. Open the rule for the default branch.
3. Under “Require status checks to pass”, copy the exact check names.

## GitHub API steps (alternative)
Use the Branch Protection API to fetch required status checks for the branch:
`GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`

## Temporary convention
Until discovered, we use temporary verifier names:
- `ci:unit`
- `ci:schema`
- `ci:lint`
- `ci:deps-delta`

## Rename plan
Once real check names are known:
1. Update CI config to emit the official check names.
2. Add a PR that renames verifiers and keeps backward-compat aliases for one week.

## MGI Gates (Temporary)
- `ci:mgi:default-off` (Default OFF gate)
- `ci:mgi:caps` (Cap gate)
- `ci:mgi:fallback` (Fallback gate)
- `ci:mgi:privacy` (Privacy gate)
- `ci:mgi:provenance` (Provenance gate)
