# Summit Draft PR Promotion Protocol

This protocol defines the mandatory sequence for promoting a Draft PR to "Ready for Review" and eventual merge queue placement during the GA hardening phase.

## 1. Promotion Criteria

A PR is eligible for promotion only if it meets the following:
*   **One Concern:** The PR addresses exactly one issue or feature (no "drive-by" changes).
*   **Green CI:** All mandatory checks (Lint, Typecheck, Jest, OPA) must pass on the latest head.
*   **Evidence ID:** Any new governance or security logic must be linked to a valid `Evidence-ID`.
*   **Owner Assigned:** A specific DRI (Directly Responsible Individual) is assigned.

## 2. Pre-flight Checklist

Before toggling from "Draft" to "Ready for Review":
1.  **Rebase on Main:** PR must be rebased on the latest `main` branch.
2.  **Conflict Resolution:** All merge conflicts must be resolved using the "Standard Rebase" policy.
3.  **Evidence Capture:**
    *   Attach `tsc` output if typechanges occurred.
    *   Attach `npm test` results for impacted modules.
    *   For UI changes, attach a screenshot/video of the feature in the sandbox.
4.  **No Repo Thrash:** Verify the PR contains zero formatting-only changes or unrelated dependency bumps.

## 3. Promotion Steps

1.  **Rebase & Push:** `git fetch origin main && git rebase origin/main && git push --force-with-lease`.
2.  **Toggle Status:** Change GitHub PR status from "Draft" to "Ready for Review".
3.  **Trigger Checks:** Rerun all CI workflows to ensure a fresh signal.
4.  **Request Review:** Explicitly request review from the component owner (see `OWNERSHIP_MODEL.md`).
5.  **Merge Queue:** Once approved, the Release Captain (Jules) will move the PR into the merge queue.

## 4. Rollback Policy

*   **Bitemporal Reversion:** If a PR causes a regression in `main`, it must be reverted immediately.
*   **Fix-Forward:** Allowed only if the fix is a single-commit correction that can be verified in <15 minutes.
*   **Audit Trail:** Every rollback must be logged in the `Provenance Ledger` with the reason and impact.

## 5. Anti-Churn Rules

*   **No Global Refactors:** Do not rename files or change directory structures.
*   **No Tooling Changes:** Do not modify `.eslintrc`, `tsconfig.json`, or CI yaml files unless the PR's primary purpose is to fix those tools.
*   **No Speculative Code:** Remove all commented-out code and "TODO" items that won't be addressed in the PR.
