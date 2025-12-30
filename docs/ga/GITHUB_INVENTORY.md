# GitHub Inventory Runbook

This runbook captures the steps to gather a point-in-time release snapshot for the Summit repository. It uses the GitHub CLI (`gh`) to report open issues, Project 19 status, security alerts, and recent CI results.

## Prerequisites

- GitHub CLI installed: <https://cli.github.com>
- `jq` installed for JSON processing.
- Authenticated via `gh auth login` with a token that has **repo**, **project**, **security_events**, and **workflow** scopes.
- Network access to `api.github.com`.

## Quick start

```bash
# From repo root
scripts/github_inventory.sh
```

The command prints the snapshot to stdout. To save a copy locally:

```bash
scripts/github_inventory.sh --output inventory.txt
```

To target a different fork:

```bash
scripts/github_inventory.sh --repo your-org/summit
```

If you lack access to Project 19, skip that call:

```bash
scripts/github_inventory.sh --no-project
```

## What the script reports

1. **Issues**: Counts of open issues for key labels (`severity:blocker`, `severity:high`, `release:ga-blocker`, `release:ga`) plus the total open count.
2. **Project 19**: Titles, item type, and Status column for up to 200 items.
3. **Security alerts**: Open Dependabot, CodeQL, and secret-scanning alerts summarized by severity or secret type.
4. **CI**: Latest 10 workflow runs with branch, status, conclusion, and timestamp.

## Troubleshooting

- `gh auth status` fails: re-run `gh auth login` with the required scopes.
- Project 19 errors: re-run with `--no-project` and verify you have project access.
- Security endpoints return 403: confirm the token includes `security_events` scope.
- Rate limits: set `GH_HOST` if using GitHub Enterprise; otherwise wait for rate limit reset.

## Evidence capture

Include the saved output (for example, `inventory.txt`) in release evidence bundles to satisfy GA readiness checkpoints around tracking, security, and CI visibility.
