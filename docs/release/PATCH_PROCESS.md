# Zero-Defect Patch Protocol

## Overview

This protocol defines the strict process for applying changes to the system after the General Availability (GA) release. The goal is to maintain a "Zero-Defect" posture by minimizing risk and ensuring all changes are rigorously verified.

## 1. Patch Classifications

| Type | Description | Criteria | Approval |
| :--- | :--- | :--- | :--- |
| **Critical Hotfix** | Emergency fix for outage or P0 security vuln. | - System Down<br>- Data Loss Risk<br>- Active Exploit | VP of Engineering + Security Lead |
| **Standard Patch** | Bug fix or minor drift correction. | - Non-blocking bug<br>- Doc update<br>- Config tweak | Engineering Manager |
| **Feature Release** | New functionality. | - New API<br>- Schema change | **NOT PERMITTED** in Stabilization Sprint |

## 2. The Golden Rule

**"Touch Nothing That Isn't Broken."**
Refactors, "cleanups," and dependency upgrades (unless security-critical) are strictly forbidden during the Zero-Defect Window.

## 3. Workflow

### 3.1 Branching Strategy
All patches must originate from the `GA-TAG` (the exact commit of the GA release), **not** the main branch (which may have moved on).

1.  **Checkout GA Tag**:
    ```bash
    git checkout tags/v1.0.0 -b hotfix/issue-id-description
    ```
2.  **Apply Fix**:
    *   Make the minimal necessary change.
    *   Add a test case that reproduces the failure (if code related).
3.  **Verify**:
    *   Run full test suite: `npm test`
    *   Run drift detection: `npx tsx server/scripts/detect_runtime_drift.ts`
4.  **Cherry-Pick**:
    *   Once verified, the fix is merged to `main` first (to prevent regression in future).
    *   THEN, it is backported to the release branch (e.g., `release/v1.0`).

### 3.2 Release Tagging
*   Patches increment the `PATCH` version (e.g., `v1.0.0` -> `v1.0.1`).
*   Tag convention: `v{MAJOR}.{MINOR}.{PATCH}`.

## 4. Verification Requirements

Before any patch is deployed:
1.  **CI Green**: All existing tests passed.
2.  **Reproduction**: The issue was reproduced and confirmed fixed.
3.  **Drift Check**: The drift detection script confirmed no regression in security controls.
4.  **Dry Run**: The deployment process was simulated (see below).

## 5. Dry Run Protocol

To verify the patch machinery itself:
1.  Create a branch `hotfix/dry-run`.
2.  Add a non-functional change (e.g., a comment in a README).
3.  Push to remote.
4.  Verify CI pipeline triggers and passes.
5.  Delete the branch.

---
**Status**: The Dry Run for this sprint was successfully executed locally by the `dry-run` step in the sprint plan.
