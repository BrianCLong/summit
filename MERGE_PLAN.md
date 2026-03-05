# Merge Plan & Dashboard

## 1. Main Health Snapshot
*   **Status**: ✅ **GREEN** (Recovered)
*   **Previous State**: ❌ RED (Build failures due to missing dependencies/vite; Failed deployment 2025-12-25).
*   **Action Taken**: Applied critical CI, lockfile, and script fixes from orphan branch `origin/operability-gate-ga-14277907292508713657`.
*   **Verification**: `npm run build` passes. `scripts/ux-ci-enforcer.cjs` passes.

## 2. Merge-Surge Dashboard
**Note**: The open PR list (`pr-open.json`) contains stale data from September 2025. The active development is happening on recent branches (dated Feb 2026), which are often **orphan branches** requiring special handling.

| Priority | Branch / Context | Risk | Status | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | `origin/operability-gate-ga-...` (CI/Lockfile Fix) | High (Orphan) | **APPLIED** | Fixes `main`. Applied as Wave 1. |
| **P1** | `origin/feat/cve-2026-25145-melange-remediation-...` | High (Security) | Ready | **Merge Now** (Wave 2). Extract files manually. |
| **P2** | `origin/feat/policy-registry-1381267937926891360` | Med (Feature) | Ready | **Merge Next** (Wave 3). Extract files manually. |
| **Stale** | 400+ PRs from Sept 2025 | Low | Backlog | Defer until `main` is stable. |

## 3. Merge Train

### Wave 1: Unblockers & Stabilization (Completed)
*   **Goal**: Restore `main` build and CI health.
*   **Action**: Extracted `.github/workflows/`, `pnpm-lock.yaml`, and `scripts/` from `origin/operability-gate-ga-14277907292508713657`.
*   **Result**: Build works. Dependencies synchronized.

### Wave 2: Security & Compliance
*   **Target**: `origin/feat/cve-2026-25145-melange-remediation-15658487723712136746`
*   **Purpose**: Remediate CVE-2026-25145 (Disclosure Packager Resiliency).
*   **Method**: Orphan branch extraction.
*   **Verify**: Run security scans.

### Wave 3: Features & Registry
*   **Target**: `origin/feat/policy-registry-1381267937926891360`
*   **Purpose**: Explainable Entity Resolution Service / Policy Registry.
*   **Method**: Orphan branch extraction.

## 4. Next 3 PRs: Minimal Hardening Steps

### 1. CI/Lockfile Fix (Applied)
*   **Blocker**: Missing `vite` binary, stale lockfile.
*   **Fix**: `git checkout origin/operability-gate-ga-14277907292508713657 -- .github/workflows pnpm-lock.yaml scripts/ tools/evidence/`

### 2. CVE Remediation (`feat/cve-2026-25145...`)
*   **Blocker**: Orphan branch history (cannot merge directly).
*   **Fix**:
    ```bash
    git checkout origin/feat/cve-2026-25145-melange-remediation-15658487723712136746 -- .
    # Note: Check if this overwrites untracked files. Prefer extracting specific directories if known.
    # Alternatively, use git merge --allow-unrelated-histories (risky).
    # Recommendation: Extract changed files.
    git show --name-only origin/feat/cve-2026-25145-melange-remediation-15658487723712136746 | xargs git checkout origin/feat/cve-2026-25145-melange-remediation-15658487723712136746 --
    ```

### 3. Policy Registry (`feat/policy-registry...`)
*   **Blocker**: Orphan branch history.
*   **Fix**: Same as above. Extract files changed in the branch.

## 5. Codex Hand-off

**Codex, execute the following:**

1.  **Verify Main**: I have already applied the CI/Lockfile fixes from the `operability-gate-ga` branch. Ensure the build passes (`npm run build`).
2.  **Merge Wave 2 (Security)**: The branch `origin/feat/cve-2026-25145-melange-remediation-15658487723712136746` is an orphan branch. You must **extract the files** manually or cherry-pick the commits. Do not attempt a standard merge.
3.  **Merge Wave 3 (Feature)**: Similarly, extract files from `origin/feat/policy-registry-1381267937926891360`.
4.  **Ignore Stale PRs**: Do not attempt to merge the PRs from September 2025 (e.g., #1365) based on their numbers alone; rely on the recent active branches.

**Proceed with Wave 2.**
