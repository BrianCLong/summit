# Merge Train Guide

This guide explains how to use the merge train tooling to safely merge PRs in sequence.

## Overview

The merge train system provides:

- **Preflight checks**: Local CI-equivalent validation before commits
- **PR queue triage**: Automated prioritization of open PRs
- **Sequential merge validation**: Check each PR in order against current main

## Quick Start

### Run Preflight Checks

Before pushing or merging, run preflight locally:

```bash
# Full preflight (mirrors CI)
make preflight

# Fast preflight (skip e2e, build)
make preflight-fast

# Direct script usage
./scripts/ci/preflight.sh --fast
./scripts/ci/preflight.sh --verbose
```

### Generate PR Queue Report

Create a triage report of all open PRs:

```bash
make pr-queue

# Or directly
./scripts/ops/pr_queue_snapshot.sh
```

Output: `docs/ops/PR_QUEUE.md` and `docs/ops/PR_QUEUE.json`

### Run Merge Train

Process PRs in order, validating each against main:

```bash
# Full validation
make merge-train prs=15486,15483,15484

# Fast validation (skip e2e)
make merge-train-fast prs=15486,15483

# Dry run (see what would happen)
./scripts/ops/merge_train.sh --prs 15486,15483 --dry-run
```

## Preflight Steps

The preflight script runs these checks in order:

| Step | Command                          | Description                        |
| ---- | -------------------------------- | ---------------------------------- |
| 1    | `pnpm install --frozen-lockfile` | Verify dependencies match lockfile |
| 2    | `eslint .`                       | Lint TypeScript/JavaScript         |
| 3    | `tsc -b`                         | TypeScript type checking           |
| 4    | `jest` (server)                  | Server unit tests                  |
| 5    | `jest` (client)                  | Client unit tests (full mode only) |
| 6    | `build:server`                   | Server build (full mode only)      |
| 7    | `build:client`                   | Client build (full mode only)      |
| 8    | `gitleaks`                       | Secret scanning (if available)     |
| 9    | provenance                       | SLSA provenance verification       |
| 10   | `playwright`                     | E2E tests (full mode only)         |

### Output

Results are written to:

- `/tmp/preflight_results.json` - Machine-readable summary
- Console output with step-by-step status
- Individual logs at `/tmp/preflight_*.log`

## Merge Train Process

For each PR in the ordered list:

1. **Fetch PR info** from GitHub
2. **Checkout PR branch**
3. **Rebase onto origin/main**
4. **Run preflight** (fast or full mode)
5. **Record result** (READY, CONFLICT, PREFLIGHT_FAILED)

### Status Codes

| Status             | Meaning                              | Action                         |
| ------------------ | ------------------------------------ | ------------------------------ |
| `READY`            | PR passed all checks, ready to merge | Proceed with merge             |
| `REBASE_CONFLICT`  | Conflicts when rebasing onto main    | Resolve conflicts manually     |
| `PREFLIGHT_FAILED` | Preflight checks failed              | Check `/tmp/preflight_prN.log` |
| `CHECKOUT_FAILED`  | Could not fetch/checkout branch      | Check branch exists            |
| `DRY_RUN`          | Dry run mode, no action taken        | Run without `--dry-run`        |

### Recovery from Failures

#### Rebase Conflicts

```bash
# Checkout the conflicting PR branch
git checkout feature/my-pr

# Rebase manually
git rebase origin/main

# Resolve conflicts
git add .
git rebase --continue

# Push updated branch
git push --force-with-lease
```

#### Preflight Failures

1. Check the log file:

   ```bash
   cat /tmp/preflight_pr15486.log
   ```

2. Fix the issues locally on the PR branch

3. Push updates and re-run merge train

## Priority Classification

PRs are classified by the queue snapshot:

- **P0**: GA gates, CI, security, release automation, supply-chain
- **P1**: High-value features and fixes (not blocking)
- **P2**: Large PRs, nice-to-have, needs work

### Recommended Merge Order

1. Merge P0 PRs first (in dependency order)
2. Then P1 PRs (in value order)
3. P2 PRs should be split or deferred if >10k lines

## Mega-PR Handling

PRs exceeding 10,000 lines are flagged as "split-needed":

1. **Do not merge directly** - too risky for big-bang integration
2. Split into smaller, focused PRs:
   - Types and interfaces first
   - Core logic second
   - UI components grouped by feature
   - Integration wiring last
3. Each split should pass preflight independently

## Makefile Targets

| Target                          | Description                      |
| ------------------------------- | -------------------------------- |
| `make preflight`                | Full preflight check             |
| `make preflight-fast`           | Fast preflight (skip e2e, build) |
| `make merge-train prs=N,N`      | Run merge train on PRs           |
| `make merge-train-fast prs=N,N` | Fast merge train                 |
| `make pr-queue`                 | Generate PR queue report         |

## Environment Variables

| Variable            | Default             | Description       |
| ------------------- | ------------------- | ----------------- |
| `GITHUB_REPOSITORY` | `BrianCLong/summit` | Target repository |

## Troubleshooting

### gh CLI not authenticated

```bash
gh auth login
```

### Preflight taking too long

Use fast mode:

```bash
make preflight-fast
```

### Want to skip failing PR and continue

Use `--force` flag (use with caution):

```bash
./scripts/ops/merge_train.sh --prs 15486,15483 --force
```

## Related Documentation

- [PR_QUEUE.md](./PR_QUEUE.md) - Current PR triage report
- [CI Workflows](../../.github/workflows/) - GitHub Actions definitions
