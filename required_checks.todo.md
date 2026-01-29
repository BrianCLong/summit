# required_checks.todo.md

## Discover required checks (GitHub UI)

1. Repo → Settings → Branches → Branch protection rules → (protected branch).
2. In "Require status checks", copy exact check names (case-sensitive).
3. Paste into `subsumption/graph-hybrid/manifest.yaml` under `required_checks.verified`.

## Discover required checks (GitHub API)

- Use: `gh api repos/<OWNER>/<REPO>/branches/<BRANCH>/protection/required_status_checks`
- Copy `contexts[]` into manifest.

## Temporary convention (until verified)

- Use `subsumption-bundle-verify` as the proposed check name.
- Rename plan: if mismatch found, update workflow job name + manifest + docs in a single PR.
