# Golden Main Governance: Merge Engine Specification

This document defines the deterministic policies and decision logic for the Merge Engine.

## Deliverable A — Deterministic Lane Rubric

| Lane | Criteria (boolean rules) | Required Labels | Required Checks | Allowed Merge Method | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`LANE/auto-merge-now`** | `ci_status == success AND conflicts == no AND draft == false AND (files_changed <= 15 AND additions+deletions <= 400) AND risk_class != breaking-change` | `lane/auto-merge`, (`prio:P0` OR `prio:P1` OR `prio:P2`) | `governance-meta-gate` (includes S-AOS body check & `check-changelog.sh`) | Squash and Merge | Primary fast-path. S-AOS headers & `<!-- AGENT-METADATA:START -->` block must be present. |
| **`LANE/fix-forward-fast`** | `ci_status IN [pending, unknown] AND conflicts == no AND draft == false AND path_glob IN (docs/**, *.md) AND files_changed <= 3` | `lane/fix-forward` | None (bypassed for isolated doc updates) | Squash and Merge | Strictly non-executable code to prevent breaking Golden Main. |
| **`LANE/conflicts`** | `conflicts == yes AND draft == false` | `lane/conflicts` | N/A (Blocked) | None (Blocked) | Drops to bottom of queue. Requires manual `git rebase origin/main`. |
| **`LANE/quarantine`** | `ci_status == failure AND conflicts == no AND draft == false` | `lane/quarantine` | N/A (Blocked) | None (Blocked) | Flake isolation. Prevents CI saturation by moving out of auto-merge. |
| **`LANE/capture-close`** | `(files_changed > 15 OR additions+deletions > 400) OR (updated_at < NOW - 14d) OR (lane == quarantine AND updated_at < NOW - 7d)` | `split-required` OR `capture-needed` | N/A | None (Auto-Close) | Sweeps oversized/stale PRs into structured Capture Issues. |

## Deliverable B — Deterministic Queue Ordering Algorithm

### 1) Plain-English Explanation
The Merge Engine processes PRs sequentially to protect Golden Main. Safe, green PRs go first (`auto-merge-now`), ordered strictly by Priority (P0 > P1 > P2). Trivial documentation fixes (`fix-forward-fast`) run in the background. Quarantined or conflicting PRs are pushed to the bottom of the queue to avoid blocking the train, and oversized/stale PRs are funneled out of the queue entirely into `capture-close`.

### 2) Priority Ladder (Highest to Lowest)
1. `LANE/auto-merge-now` + `prio:P0`
2. `LANE/auto-merge-now` + `prio:P1`
3. `LANE/auto-merge-now` + `prio:P2`
4. `LANE/fix-forward-fast`
5. `LANE/quarantine` (evaluated for 1x auto-rerun)
6. `LANE/conflicts` (ignored until author rebases)
7. `LANE/capture-close` (processed for closure/templating)
8. Drafts (ignored)

### 3) Pseudocode Algorithm
```python
def calculate_pr_rank(pr):
    if pr.is_draft: return -1 # Ignore drafts

    score = 0

    # Primary Sort: Lane Assignment
    if pr.lane == 'LANE/auto-merge-now': score += 1000000
    elif pr.lane == 'LANE/fix-forward-fast': score += 800000
    elif pr.lane == 'LANE/quarantine': score += 200000
    elif pr.lane == 'LANE/conflicts': score += 100000
    elif pr.lane == 'LANE/capture-close': score += 0

    # Secondary Sort: Priority Class
    if 'prio:P0' in pr.labels: score += 50000
    elif 'prio:P1' in pr.labels: score += 30000
    elif 'prio:P2' in pr.labels: score += 10000

    return score

def get_deterministic_queue(open_prs):
    # Sort by rank, then tie-breaker 1 (oldest updated first to prevent rot),
    # then tie-breaker 2 (lowest PR number)
    return sort(open_prs, key=lambda pr: (
        calculate_pr_rank(pr),
        -pr.updated_at.timestamp(),
        -pr.number
    ), reverse=True)
```

## Deliverable C — Auto-Labeling Policy

**Taxonomy & Deterministic Rules:**

*   **Priority Labels (`prio:P0`, `prio:P1`, `prio:P2`)**
    *   *Trigger for `P0-candidate`:* Applied automatically if `path_glob` hits `auth/**`, `crypto/**`, `scripts/ci/**`, `docs/governance/**`, or `ops/docker-compose.yml`.
    *   *Promotion to `prio:P0`:* `P0-candidate` elevates to `prio:P0` **only** if manually assigned by a maintainer OR tied to an active incident release gate. Otherwise, defaults to `prio:P1`.
    *   *Default:* PRs without `P0-candidate` become `prio:P2`.
*   **CI State Labels (`ci-green`, `ci-red`, `ci-pending`)**
    *   *Trigger:* Directly mapped from the `governance-meta-gate.mjs` rollup status check. (No new GitHub status contexts are added).
*   **Lane & Conflict Labels**
    *   *Trigger for `conflicts`:* GitHub API `mergeable_state == 'dirty'`.
    *   *Trigger for `lane/*`:* Strictly assigned on every webhook tick based on the Deliverable A Rubric.
*   **Intervention Labels (`merge-blocker`, `split-required`, `capture-needed`)**
    *   *Trigger for `merge-blocker`:* `ci-red` AND `prio:P0` on Golden Main.
    *   *Trigger for `split-required`:* `files_changed > 15` OR `additions+deletions > 400`.
    *   *Trigger for `capture-needed`:* PR inactive for > 14 days OR stuck in `lane/quarantine` for > 7 days.
