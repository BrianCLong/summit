<<<<<<< ours
# Merge Policy: Golden Main Merge Engine

## Purpose

This policy defines deterministic pull request triage, ordering, and stop conditions that keep `main` green at all times while preserving all contributor work.

## Lane Model

- **auto-merge**: CI green, conflict-free, non-large, non-quarantine PRs.
- **fix-forward**: CI red but otherwise mergeable; author/owner remediation required.
- **conflicts**: conflict resolution required before queue admission.
- **quarantine**: risk-path touching PRs with non-green CI or explicit quarantine signal.
- **capture-close**: large or persistently blocked work that must be sliced into tracked issues.

## Deterministic Queue Algorithm

Queue order is generated from `artifacts/pr_inventory.json` by stable keys:

1. CI status (`green` first),
2. conflict state (conflict-free first),
3. risk classification (low-risk first),
4. recency (`updatedAt` newest first),
5. PR number ascending as final tie-break.

Same input inventory produces identical queue output.

## Stop Conditions (Merge Train)

Merge train halts immediately when any of the following occurs:

- post-merge required checks on `main` are red,
- merge conflict emerges at merge-time,
- required checks for the PR lane are missing or failing,
- governance/security quarantine conditions are triggered.

## Capture Rules (No Work Lost)

Unmergeable work is not discarded. For `quarantine` and `capture-close` lanes:

- convert blocked PR intent into issues,
- include scope slices with acceptance criteria,
- preserve file-level context and risk/test checklist,
- label for prioritization (`capture-needed`, `needs-triage`).

## Atomic PR Requirement

Merge Engine changes must ship as atomic roadmap increments:

- one roadmap prompt per PR,
- deterministic artifacts attached,
- no speculative merge actions in scaffolding PRs,
- explicit rollback path for execution-phase PRs.
=======
# Merge Policy

## Golden Main
*   **No direct pushes** to `main`.
*   **No direct merges** of PRs.
*   All changes must pass through the **Merge Queue**.

## Deterministic Merge Train
The merge queue serializes merges and tests them on top of the current `main` (stacked commits) before merging. This ensures a linear history and prevents "green PR / red main" drift.

### Queue Labels
Use the following labels as the only queue state machine:

* `queue:merge-now` — green checks, mergeable, approved.
* `queue:needs-rebase` — stale against `main` and requires branch update.
* `queue:conflict` — merge state is conflicting.
* `queue:blocked` — waiting on design/security/human decision.
* `queue:obsolete` — superseded, duplicate, or no longer valid.
* `queue:ready` — legacy compatibility label accepted by auto-enqueue.

### Deterministic ordering
When selecting PRs for each merge batch, order strictly by:

1. `prio:P0` → `prio:P1` → `prio:P2`
2. mergeability (`clean` before uncertain)
3. required checks status (`success` first)
4. oldest updated first

### How to Merge
1.  **Open a PR**.
2.  **Pass all required checks**.
3.  **Get approval**: at least one approving review is required.
4.  **Apply queue label**: use `queue:merge-now` (or `queue:ready` for compatibility).

### Automation
*   `auto-enqueue.yml` monitors PR updates/reviews/check completion.
*   A PR is enqueued only if:
    * it is open and not draft,
    * merge state is not `DIRTY` (no conflicts),
    * required checks are green,
    * approval threshold is met,
    * label includes `queue:merge-now` or `queue:ready`.
*   Queue checks run again on the merge group commit before merge.
*   If queue checks fail, the PR is dequeued and must be reclassified (`queue:needs-rebase`, `queue:conflict`, or `queue:blocked`).

### Operational Search Queries
Use these GitHub searches as the control panel:

* Baseline open PRs:
  * `is:pr is:open repo:BrianCLong/summit`
* Merge-ready candidates:
  * `is:pr is:open repo:BrianCLong/summit status:success -label:queue:blocked -label:queue:conflict`
* Conflict lane:
  * `is:pr is:open repo:BrianCLong/summit label:queue:conflict`
* Stale/failing lane:
  * `is:pr is:open repo:BrianCLong/summit status:failure`
* P0 merge-ready:
  * `is:pr is:open repo:BrianCLong/summit label:prio:P0 status:success`

### Troubleshooting
*   **Flaky Tests**: retry once, then fix root cause before re-enqueue.
*   **Merge Conflicts**: relabel as `queue:conflict`; rebase or supersede.
*   **Stale Branches**: relabel as `queue:needs-rebase`, update branch, re-run checks.

### Emergency Bypass
*   Bypassing the queue is restricted to **Admins** and strictly for **Emergency Hotfixes**.
*   Any bypass must be documented in a post-mortem and linked governance evidence.
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
