# PR Flow (Quick Start)

Use this when branch protection requires PRs for `main`.

## Steps

1. Create a branch.
   - `git checkout -b feat/short-topic`

2. Make changes and commit locally.
   - `git status -sb`
   - `git add -A`
   - `git commit -m "feat: describe change"`

3. Push the branch and open a PR.
   - `git push -u origin feat/short-topic`

4. Fill out the PR template and wait for required checks.
   - Lint / tests / security gates must pass before merge.

## Notes

- Direct pushes to `main` are blocked by default.
- If you need an exception, coordinate with repository admins.
