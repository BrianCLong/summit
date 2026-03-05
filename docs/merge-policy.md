# Merge Policy & Golden Main Runbook

This document defines the deterministic Merge Engine for `brianclong/summit`. The core mandate is absolute stability: **Golden Main must always be green, deployable, and cryptographically verifiable.**

## 1. Definitions
*   **Golden Main:** The `main` branch. It represents the immutable, deployable state of the intelligence platform.
*   **Merge Train:** The CODEX-driven queueing system that evaluates S-AOS headers, Lineage signatures, and batches PRs sequentially.
*   **Lane:** A mutually exclusive processing category.
*   **Capture:** The automated ingestion of oversized or unmergeable PRs into structured tracking issues to prevent stagnation.

## 2. Train Operations & Batch Sizing
*   **Default Batch Size:** 1 PR per train run (Strict sequential merging).
*   **High-Volume Mode:** If the queue > 15 PRs, the engine evaluates up to 5 PRs in parallel *only* if they modify disjoint directory paths.

## 3. The "Stop-On-Red" Rule
If Golden Main fails CI (`governance-meta-gate.mjs` fails):
1. The train STOPS. All `LANE/auto-merge-now` PRs are frozen.
2. Only PRs labeled `merge-blocker` or `prio:P0` targeting CI/infra paths are allowed to process.
3. Once Golden Main is restored to green, the queue resumes automatically.

## 4. Flake Handling Rule
*   If a PR in `auto-merge-now` transitions to `ci-red`, it receives **exactly one** automatic retry.
*   If it fails twice, it is relegated to `LANE/quarantine` and an automated comment isolates the culprit test constraint. The PR drops to the bottom of the queue.

## 5. Conflict Resolution
*   The Merge Train **does not** resolve conflicts.
*   PRs enter `LANE/conflicts`. Authors must locally `git rebase origin/main` and force push. Merge commits are prohibited.

## 6. Approved Merge Methods
*   **Strictly Squash and Merge.**
*   **Why:** Ensures linear, bisectable Git history and guarantees that the `summit.lineage.stamp.v1` schema binds to exactly one atomic commit per S-AOS evidence bundle.

## 7. Revert Protocol
*   If a merged PR breaks Golden Main, the engine automatically generates a revert PR (`gh pr create --base main --head revert-<sha>`), labels it `prio:P0` and `merge-blocker`, and front-runs the queue.
