# Merge Hygiene & Queueing Policy

To maintain high throughput and minimize conflicts, **Summit** enforces the following merge hygiene rules.

## The Happy Path (PR -> Merge)

1.  **Open PR:**
    *   Title follows Conventional Commits (e.g., `feat(server): add user profile`).
    *   Description includes the **Boundary Safety Proof** (e.g., "Changes limited to `server/src/user`").
2.  **Automated Checks (Fast):**
    *   `scripts/check-boundaries.cjs` passes.
    *   `scripts/smart-test.cjs` runs and passes targeted tests.
3.  **Review:**
    *   Code Owners review boundary-crossing changes.
    *   Agents verify scope compliance.
4.  **Merge:**
    *   Use the **Merge Queue**.

## Merge Policy

> **Merge Policy:** All changes to `main` land via the merge queue. Required checks: `CI Core Gate ✅`, `CI Verify Gate ✅`. PRs join the queue only after approval, green CI, and zero conflicts. Flaky tests must be quarantined or retried in‑job; do not bypass the queue.

## Day‑to‑day usage (team ritual)

1. Devs open PRs as usual.
2. When approved + CI green, they **click "Merge when ready" (Add to merge queue)**.
3. Train runs; if a failure occurs:
   * The failing PR is auto‑removed.
   * The queue continues with the next PR.
4. Main only advances on train‑green merges.

## Merge Ordering Rules

When multiple PRs are open, prioritize:

1.  **Shared Infrastructure (`packages/`, `infra/`):** Merge these *first* if they are dependencies for other PRs.
2.  **Independent Leaf Features:** `apps/web` or `client` UI changes can usually merge asynchronously.
3.  **Backend Core:** `server` changes should be serialized if they touch the database schema.

## Conflict Resolution

*   **Do not resolve conflicts in the GitHub UI.**
*   **Rebase locally:**
    ```bash
    git fetch origin main
    git rebase origin/main
    # Resolve conflicts
    git push --force-with-lease
    ```

## Anti-Patterns

*   **Mega-PRs:** PRs touching Server + Client + Infra + Docs. *Split these up.*
*   **Long-Lived Feature Branches:** Rebase daily.
*   **Blind Merging:** Ignoring CI failures "because they are flaky." Fix the test or disable it explicitly.
