Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Merge Train Protocol

**Goal:** Turn the PR firehose into a deterministic merge train.

## 1. Merge Order Rules

We prioritize merges to maximize throughput and stability:

1.  **Small & Independent**: PRs that touch isolated files (docs, scripts, new modules) and are green.
2.  **Guardrails & Evidence**: PRs that add observability, tests, or docs (improves future stability).
3.  **Feature Logic**: PRs implementing business logic, provided they are green.
4.  **Systemic Refactors**: Large changes to build/test infra (must be coordinated).

**Stop the Line**: If `main` is broken (CI failing on head), **no merges** until fixed. All effort shifts to unblocking `main`.

## 2. Merge Requirements (The "Green Contract")

To be eligible for the merge train, a PR must:

- Pass all **Blocking** CI checks defined in `ci.yml`.
- Have **No Merge Conflicts** with `main`.
- Have a descriptive title and body.
- Adhere to the [Green CI Contract](../governance/GREEN_CI_CONTRACT.md).

## 3. Label Taxonomy

| Label                    | Meaning                           | Action                                    |
| :----------------------- | :-------------------------------- | :---------------------------------------- |
| `status: merge-ready`    | Green, approved, ready to land.   | **Jules/Maintainer**: Merge immediately.  |
| `status: needs-fix`      | Failing checks or conflicts.      | **Author**: Fix issues.                   |
| `status: blocked-ci`     | Failing due to infra/flaky tests. | **Claude/Infra**: Investigate root cause. |
| `status: blocked-review` | Waiting for human/agent review.   | **Reviewers**: Provide feedback.          |
| `priority: P0`           | Critical fix / Unblocker.         | Jump to front of queue.                   |

## 4. Conflict Resolution

- **Author's Responsibility**: If a PR has conflicts, the author must rebase on `main` and resolve them.
- **"Jules" Bot**: Will not attempt to resolve logical conflicts. May automate simple rebase if enabled.

## 5. Triage Process

1.  Run `pnpm pr:triage` to generate the current status report.
2.  Review `status: merge-ready` candidates.
3.  For `status: blocked-ci`, run `pnpm ci:cluster` to identify common failure patterns.
4.  Assign blockers to appropriate owners.
