# P0/P1 Execution Bundle: Repo Health Snapshot

> **Date:** 2026-01-03
> **Author:** Jules (Program-Manager Engineer)
> **Status:** Active Execution

## 1. Current Health Summary

**✅ STATUS: Toolchain Resurrected**
(Was: 🚨 Toolchain Collapse)

We have successfully restored `tsc` and `vitest` execution capabilities by adding missing root dependencies and forcing a re-link of the workspace.

*   **Install:** **PASS** (with `pnpm install --force`).
*   **Lint:** **FAIL** (100% failure rate). ESLint 9 is enforcing stricter ignore patterns, causing `eslint .` to fail with "files ignored".
*   **Typecheck:** **PARTIAL** (Execution works, Code fails). `tsc` runs but catches real errors (e.g., `TS2742` in `tenant-api`).
*   **Build:** **PARTIAL** (Same as typecheck).
*   **Tests:** **PARTIAL** (Execution works, Tests fail). `vitest` runs but tests timeout or fail logic assertions (e.g., `apps/command-console` timeouts).

### Top Failure Signatures

1.  **Lint Config:** `You are linting "src", but all of the files matching the glob pattern "src" are ignored.`
2.  **Type Exports:** `TS2742: The inferred type of 'app' cannot be named without a reference to ...`
3.  **Test Timeouts:** `Test timed out in 5000ms` (likely due to missing mocks for network/rendering).

---

## 2. P0 List (CI Blockers)

| Priority | Symptom | Root Cause | Owner | Fix Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | `eslint` "files ignored" error | ESLint 9 config mismatch with `eslint .` command. | **Codex** | Update `.eslintignore` or command to exclude auto-ignored files explicitly, or upgrade config to flat format correctly. |
| **P0** | `TS2742` in `tenant-api` | Exported types rely on unexported or shadow dependencies (`express-serve-static-core`). | **Qwen** | Explicitly type the exported `app` or add the missing type definition to `packages/tenant-api/package.json`. |
| **P0** | Test Timeouts (`apps/command-console`) | Tests likely attempting real network calls or rendering heavy components without mocks. | **Jules** | **[COMPLETED]** Fixed toolchain execution. Now need to fix test isolation (Green CI Contract). |

---

## 3. P1 List (Stability & Hygiene)

| Priority | Symptom | Root Cause | Owner | Fix Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | Mixed Test Runners (Jest/Vitest) | Repo has both, leading to confusion and split CI paths. | **Claude** | Standardize on one runner where possible or explicitly segregate. |
| **P1** | "Falling back to pinned pnpm" | CI workflows force an old pnpm version (9.12.0) vs repo version (10.0.0). | **Claude** | Update `.github/workflows` to use `packageManager` field from `package.json`. |

---

## 4. Owner Partition

*   **Claude:** CI Workflow standardization (fixing the pnpm version mismatch, standardizing test runners in YAML).
*   **Codex:** dependency alignment (ESLint fixes across 600+ packages, script normalization).
*   **Qwen:** Specific package fixes (e.g., `apps/command-console` specific logic errors once toolchain is up).
*   **Jules (Me):** **Toolchain Resurrection & Verification.**
    *   **DELIVERED:** `scripts/ci/ci-parity.sh` (Deterministic local CI).
    *   **DELIVERED:** Fixed `vitest` execution by adding to root deps.
    *   **DELIVERED:** Green CI Contract documentation.

## 5. Verification Commands

Run the parity script to verify toolchain health (it will fail on lint/typecheck, but execute successfully):

```bash
./scripts/ci/ci-parity.sh
```
