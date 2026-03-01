# Merge Policy

## Golden Main
*   **No direct pushes** to `main`.
*   **No direct merges** of PRs.
*   All changes must pass through the **Merge Queue**.

## Merge Queue (Merge Train)
The merge queue serializes merges and tests them on top of the current `main` (stacked commits) before merging. This ensures a linear history and prevents "green PR / red main" drift.

### How to Merge
1.  **Open a PR**.
2.  **Pass all CI Checks**:
    *   `ci/build`
    *   `ci/test`
    *   `lint`
    *   `security`
3.  **Get Approval**: At least one approving review is required.
4.  **Label `queue:ready`**: Once approved and green, apply the `queue:ready` label.

### Automation
*   An automated workflow monitors PRs.
*   When a PR is `Approved`, `CI-Green`, and labeled `queue:ready`, it is **automatically enqueued**.
*   The queue will run checks again on the merge commit.
*   If successful, the PR merges automatically.
*   If failed, the PR is removed from the queue.

### Troubleshooting
*   **Flaky Tests**: CI workflows are configured to retry known flaky tests once. If a test fails persistently, investigate the root cause.
*   **Merge Conflicts**: If a conflict arises in the queue, the PR will be dequeued. Resolve conflicts locally and re-enqueue.

### Emergency Bypass
*   Bypassing the queue is restricted to **Admins** and strictly for **Emergency Hotfixes** (e.g., stopping a live incident).
*   Any bypass must be documented in a post-mortem.
