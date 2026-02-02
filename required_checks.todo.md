# Required Checks Discovery

## GitHub UI steps

1. Open repository **Settings** in GitHub.
2. Navigate to **Branches** -> **Branch protection rules**.
3. Edit the rule for `main` (or the default branch).
4. Locate **Require status checks to pass before merging**.
5. Copy the exact names of the required checks listed there.

## GitHub API outline (optional)

- `GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`
- Use a personal access token with read access (do not commit or store tokens).

## Temporary gate names (replace once discovered)

- `ci:cogsec-evidence` - Evidence bundle verification.
- `ci:cogsec-governance` - Governance lint (future PR).
- `ci:tests` - Standard test runner.

## Rename plan

Once official names are confirmed, rename workflows or add aliases to match the branch protection
rules exactly.
