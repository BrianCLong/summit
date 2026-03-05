# PR Backlog Zero Playbook (Deterministic Merge Train)

This playbook resolves large PR backlogs into terminal states without saturating CI or destabilizing `main`.

## Terminal States

Every open PR must end in exactly one state:

1. **Merged**
2. **Auto-closed as obsolete**
3. **Split/re-filed** (reserved for oversized coupled changes)

## Queue Labels

Apply the following labels as the only queue source of truth:

- `queue:merge-now`
- `queue:needs-rebase`
- `queue:conflict`
- `queue:blocked`
- `queue:obsolete`

Priority labels (`prio:P0`, `prio:P1`, `prio:P2`, ...) define ordering inside `queue:merge-now`.

## CI Saturation Guardrails

- Enforce workflow-level `concurrency.group: ${{ github.workflow }}-${{ github.ref }}`.
- Set `cancel-in-progress: true` for PR-triggered workflows.
- Merge only green PRs that satisfy CODEOWNERS/required reviews.

## Deterministic Ordering

Sort queue candidates by:

1. Priority: `prio:P0` → `prio:P1` → ...
2. `mergeable = MERGEABLE`
3. `status = SUCCESS`
4. Oldest `updatedAt` first

## Operational Queries

- Baseline open PRs:
  - `is:pr is:open repo:BrianCLong/summit`
- Green candidates:
  - `is:pr is:open repo:BrianCLong/summit status:success -label:queue:blocked -label:queue:conflict`
- Conflict bucket:
  - `is:pr is:open repo:BrianCLong/summit label:queue:conflict`
- Failing checks (rebase triage feed):
  - `is:pr is:open repo:BrianCLong/summit status:failure`
- P0 ready lane:
  - `is:pr is:open repo:BrianCLong/summit label:prio:P0 status:success`

## Planner Script

Use the planner script to classify PR JSON snapshots and produce next merge batches.

```bash
node scripts/ops/merge_train_queue_planner.mjs \
  --input artifacts/open-prs.json \
  --batch-size 25 \
  --stale-days 45
```

Expected output includes:

- queue counts by terminal/action label
- `nextBatch` PR numbers in deterministic order
- bucketed PR metadata for operational routing

## Hourly Merge Loop

1. Generate PR snapshot (`gh pr list`/GraphQL export).
2. Run planner and label PRs according to output.
3. Merge `queue:merge-now` batch constrained to current CI capacity.
4. Re-run planner after each batch to classify fallout.
5. Resolve `queue:conflict` by hotspot files/classes, not one-off PR-by-PR patching.

## Exit Criteria

Backlog is complete only when open PR count reaches zero through merge + closure outcomes,
while `main` remains protected by required checks and zero red merges.
