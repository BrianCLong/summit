# Merge Hygiene & Queueing Policy

To maintain high throughput and minimize conflicts, **Summit** enforces the following merge hygiene rules.

## The Happy Path (PR -> Merge)

1.  **Open PR:**
    - Title follows Conventional Commits (e.g., `feat(server): add user profile`).
    - Description includes the **Boundary Safety Proof** (e.g., "Changes limited to `server/src/user`").
2.  **Automated Checks (Fast):**
    - `scripts/check-boundaries.cjs` passes.
    - `scripts/smart-test.cjs` runs and passes targeted tests.
3.  **Review:**
    - Code Owners review boundary-crossing changes.
    - Agents verify scope compliance.
4.  **Merge:**
    - Use **Squash and Merge** to maintain a linear history.

## Merge Ordering Rules

When multiple PRs are open, prioritize:

1.  **Shared Infrastructure (`packages/`, `infra/`):** Merge these _first_ if they are dependencies for other PRs.
2.  **Independent Leaf Features:** `apps/web` or `client` UI changes can usually merge asynchronously.
3.  **Backend Core:** `server` changes should be serialized if they touch the database schema.

## Conflict Resolution

- **Do not resolve conflicts in the GitHub UI.**
- **Rebase locally:**
  ```bash
  git fetch origin main
  git rebase origin/main
  # Resolve conflicts
  git push --force-with-lease
  ```
- **Merge Queue:** The repository uses a Merge Queue (configured in `.github/workflows/merge-queue-config.yml`). Use it to serialize merges during high traffic.

## Anti-Patterns

- **Mega-PRs:** PRs touching Server + Client + Infra + Docs. _Split these up._
- **Long-Lived Feature Branches:** Rebase daily.
- **Blind Merging:** Ignoring CI failures "because they are flaky." Fix the test or disable it explicitly.
