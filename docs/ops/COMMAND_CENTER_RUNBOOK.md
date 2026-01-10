# Command Center Runbook

## Overview

The Command Center is a tool to generate a single "state of the world" report for the repo, aggregating data from GitHub PRs, issues, and security alerts, as well as local CI signals. It is used to plan the daily merge train and identify blocking issues.

## Usage

### Prerequisites
- Node.js 18+
- `pnpm`
- `gh` CLI (for live mode) authenticated via `gh auth login`

### Modes

#### 1. Live Mode
Connects to GitHub API via `gh` CLI to fetch real-time data.

```bash
pnpm ops:command-center
# OR
node scripts/ops/command-center.ts --mode=live
```

#### 2. Offline Mode (Testing / Fallback)
Uses local JSON snapshots located in `scripts/ops/snapshots/`. Useful for testing the generator logic or when offline.

```bash
pnpm ops:command-center:offline
# OR
node scripts/ops/command-center.ts --mode=offline --snapshotsDir=scripts/ops/snapshots
```

## Maintenance

### Updating Snapshots
To update the offline snapshots with real data (requires `gh`):

```bash
# Example commands to refresh snapshots manually
gh pr list --limit 50 --json number,title,headRefName,author,updatedAt,labels,mergeable,state,files,additions,deletions,statusCheckRollup > scripts/ops/snapshots/pr_list.json
gh issue list --limit 100 --json number,title,labels,updatedAt,state > scripts/ops/snapshots/issues.json
# ... (see script for full list of inputs)
```

### Adding New Failure Clusters
Edit `scripts/ops/command-center.ts` and update the `CLUSTERS` object regex patterns.

### Claude Integration
To wire this into CI later, add a step in `.github/workflows/ci.yml` that runs:
`pnpm ops:command-center:offline` (to verify the script runs) or `pnpm ops:command-center` (if GITHUB_TOKEN is available) to generate an artifact.
