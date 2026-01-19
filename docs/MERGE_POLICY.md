# Merge Hygiene & Queueing Policy

To maintain high throughput and minimize conflicts, **Summit** enforces the following merge hygiene rules.

> **Team Operating Policy:**
> *   All changes to `main` must land via the merge queue.
> *   Required checks: build, test, lint, security.
> *   Approved, CI-green PRs are labeled `queue:ready`.
> *   No direct merges. No bypasses.

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
    *   **Approval required** (minimum 1).
4.  **Enqueue:**
    *   Apply the `queue:ready` label.
    *   The **Merge Train** will pick it up, test it with the latest `main`, and merge it automatically.

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
*   **Merge Queue:** The repository uses a Merge Queue (configured in `.github/workflows/auto-enqueue.yml`). Use it to serialize merges during high traffic.

## Anti-Patterns

*   **Mega-PRs:** PRs touching Server + Client + Infra + Docs. *Split these up.*
*   **Long-Lived Feature Branches:** Rebase daily.
*   **Blind Merging:** Ignoring CI failures "because they are flaky." Fix the test or disable it explicitly.
