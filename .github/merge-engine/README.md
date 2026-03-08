# Merge Engine (PR#1 Skeleton)

This directory contains deterministic triage and queue scaffolding for the Golden Main Merge Engine.

## GitHub Search Queries

Copy/paste these in GitHub PR search:

- Open PRs:
  - `is:pr is:open repo:brianclong/summit`
- Conflicts = yes:
  - `is:pr is:open repo:brianclong/summit is:unmerged draft:false conflicts:yes`
- Conflicts = no:
  - `is:pr is:open repo:brianclong/summit is:unmerged draft:false conflicts:no`
- CI success:
  - `is:pr is:open repo:brianclong/summit status:success`
- CI failure:
  - `is:pr is:open repo:brianclong/summit status:failure`
- CI pending:
  - `is:pr is:open repo:brianclong/summit status:pending`
- Stale (>14d no update):
  - `is:pr is:open repo:brianclong/summit updated:<{{yyyy-mm-dd_minus_14d}}`
- P0 tagged:
  - `is:pr is:open repo:brianclong/summit label:P0`
- P0 candidate (risk paths):
  - `is:pr is:open repo:brianclong/summit label:P0-candidate`
- Draft PRs:
  - `is:pr is:open repo:brianclong/summit is:draft`

## Lane Definitions

- `lane/auto-merge`
  - Green CI, no conflicts, non-large PR, low governance risk.
  - Enters deterministic queue for merge-train execution.
- `lane/fix-forward`
  - CI red but mergeable and not conflict-blocked.
  - Requires owner fix-forward before re-queue.
- `lane/conflicts`
  - Merge conflict detected.
  - Requires rebase/conflict resolution.
- `lane/quarantine`
  - Risk-path touching PRs with non-green CI or explicit quarantine label.
  - Requires heightened review and checks.
- `lane/capture-close`
  - Large or persistently blocked PRs slated for work-capture issue slicing.

## Green-at-all-times Rule

Golden main must remain green continuously.

1. Merge train processes PRs in deterministic order from `artifacts/pr_queue.md`.
2. Stop immediately on the first red signal.
3. Revert protocol:
   - Identify last merged PR.
   - Revert via dedicated revert PR.
   - Re-run required checks before continuing queue.

## Tracking Issue

Create one issue titled **Merge Engine Dashboard**. The scheduled workflow can publish:

- counts per lane,
- top queue entries,
- top blockers.

PR#1 defaults to artifact upload only (safe scaffolding, no merge actions).
