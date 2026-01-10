# Incident Response Drill Scenario: Ghost Artifact Injection

**Date:** 2024-05-23
**Drill Type:** Table-Top / Simulation
**Scenario Class:** Release Hygiene Failure

## 1. The Scenario

**"Ghost Artifact Injection"**

A release engineer prepares the MVP-4 Stabilization RC on a local machine (or a misconfigured CI runner) that contains sensitive untracked files (e.g., `config/local-secrets.json` or `dist/debug-symbols.map`).

The release preparation script (`scripts/release/prepare-stabilization-rc.sh`) verifies the git state using `git diff-index --quiet HEAD`. This command checks for *modified tracked files* but **ignores untracked files**.

Consequently, the release bundle is generated and potential Docker builds consume the "dirty" context, injecting the untracked sensitive file into the release artifact.

## 2. Why this is Realistic

1.  **Tooling Gap:** Our current `check_working_tree` function uses `git diff-index` which is designed for checking index consistency, not workspace hygiene.
2.  **Human Error:** Developers often have `.env` files or temporary data (`temp/`) that are not globally git-ignored but shouldn't be in a release build context.
3.  **Silent Failure:** The script outputs "Working tree is clean" (false negative), giving the operator false confidence to proceed.

## 3. What "Failure" Looks Like

*   **Detection:** `git diff-index` returns `0` (Success).
*   **Result:** The script proceeds to generate `commands.sh` and `summary.json`.
*   **Impact:** If the operator runs the subsequent `docker build .` (as instructed by `commands.sh`), the untracked file is COPY'd into the image (unless explicitly `.dockerignore`d, which is a second layer of defense that often fails).

## 4. Success Criteria for Drill

*   **Detection:** The drill must demonstrate that `git status --porcelain` captures the issue while the current control misses it.
*   **Mitigation:** The gap must be closed by updating the release script to enforce a strict "no untracked files" policy.
