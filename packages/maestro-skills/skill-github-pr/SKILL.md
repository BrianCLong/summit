# GitHub PR Skill

**Purpose:** Manage GitHub Pull Requests autonomously.

## Inputs
- `repo`: The repository in format `owner/name`.
- `title`: Title of the PR.
- `body`: Description of the PR.
- `base`: Target branch (default: `main`).
- `head`: Source branch.

## Outputs
- `pr_url`: The link to the created PR.
- `pr_number`: The integer ID of the PR.

## Permissions
Requires `GITHUB_TOKEN` in the environment.
Accesses `api.github.com`.
