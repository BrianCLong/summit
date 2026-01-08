# GA Verification Gate Contract

## Overview

The `pnpm ga:verify` command is the **single source of truth** for General Availability (GA) readiness. It serves as the acceptance gate for all release candidates and acts as an informational check for standard development workflows.

## The Contract

1.  **Single Entry Point**: All verification is invoked via `pnpm ga:verify`.
2.  **Determinism**: Rerunning the gate on the same commit must produce identical results and evidence structure (excluding timestamps).
3.  **Acceptance Gating**:
    *   **Blocking**: For PRs with the `release-intent` label or targeting `release/*` branches.
    *   **Informational**: For standard feature/fix PRs (failures do not block merge unless enforced by repository policy).
4.  **Evidence**: A successful run **must** produce a cryptographic evidence pack in `docs/releases/evidence/<sha>/`.

## Verification Scope

The `ga:verify` command orchestrates the following strict checks:

1.  **Type Safety**: `pnpm typecheck` (Full project TypeScript compilation)
2.  **Code Quality**: `pnpm lint` (ESLint, Prettier, etc.)
3.  **Build Integrity**: `pnpm build` (Production build verification)
4.  **Unit Logic**: `pnpm --filter intelgraph-server test:unit` (Server-side unit tests)
5.  **Integration Smoke**: `pnpm ga:smoke` (Critical path verification)

## Pass/Fail Criteria

*   **PASS**: All steps complete with exit code `0`. An evidence pack is generated and stored.
*   **FAIL**: Any step returns non-zero. No evidence pack is generated (or marked incomplete).

## Environment Assumptions

*   **Runtime**: Node.js >= 18.18 (as defined in `.node-version` / `package.json`)
*   **Package Manager**: `pnpm` (version managed via `corepack` or `package.json`)
*   **OS**: Linux (CI/Production reference), macOS/Windows (Local Dev supported)

## Evidence Pack Structure

On success, artifacts are stored at `docs/releases/evidence/<COMMIT_SHA>/`:

```text
docs/releases/evidence/<COMMIT_SHA>/
├── index.md            # Summary of the run
├── manifest.json       # Machine-readable metadata (versions, SHA, OS)
├── output.log          # Combined output of the verification run
└── artifacts/          # (Optional) Additional build artifacts
```

## Usage

### Local Development

```bash
# Standard run (informational mode default)
pnpm ga:verify

# Force strict blocking mode (simulating release gate)
GA_VERIFY_STRICT=true pnpm ga:verify
```

### CI Implementation

The CI workflow `.github/workflows/ga-verify.yml` automatically enforces this contract. It detects release intent based on PR labels and branch targets to toggle strict mode.
