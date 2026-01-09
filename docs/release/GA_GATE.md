# GA Gate Composite Check

## Overview

The `ga / gate` is the single, authoritative composite check for GA readiness in the `BrianCLong/summit` monorepo. It aggregates the results of all GA-critical CI signals into a unified status.

*   **Status**: Required for PR merge.
*   **Workflow File**: `.github/workflows/ci.yml`
*   **Job Name**: `ga / gate` (stable identifier)

## Purpose

The goal of this composite gate is to:
1.  **Simplify Branch Protection**: Require only one stable check (`ga / gate`) instead of a fragile list of 15+ granular jobs.
2.  **Enforce Determinism**: Ensure that if any critical signal is missing (skipped, cancelled) or failed, the gate fails.
3.  **Preserve Debuggability**: While the gate aggregates results, the individual jobs (`test`, `lint`, `governance`, etc.) remain visible in the GitHub Actions UI for debugging.

## Dependency Set

The `ga / gate` job depends on the following critical signals:

| Job Name | Description | Failure Policy |
| :--- | :--- | :--- |
| `format-check` | Prettier formatting check | Strict |
| `lint` | ESLint and code style | Strict |
| `verify` | Verification suite (scripts/verify-*) | Strict |
| `test` | Unit and Integration tests (matrix) | Strict (respects `continue-on-error`) |
| `golden-path` | `make smoke` full stack check | Strict |
| `reproducible-build` | Deterministic build verification | Strict |
| `governance` | Governance policy checks | Strict (respects `continue-on-error`) |
| `provenance` | SLSA provenance generation | Strict (respects `continue-on-error`) |
| `schema-diff` | GraphQL schema compatibility | Strict (respects `continue-on-error`) |
| `ecosystem-exports` | Data export verification | Strict |
| `security` | Security scanning (Snyk, etc.) | Strict |
| `ga-risk-gate` | Release risk assessment | Strict |
| `build-server-image` | Container build verification | Strict |

> **Note on `continue-on-error`**: Some jobs are currently configured with `continue-on-error: true` in `ci.yml` due to known infrastructure debt. The `ga / gate` sees these as `success` if the workflow logic handles them. This preserves the *current* definition of green, but ensures that if the job *actually crashes* or is skipped, the gate fails.

## Failure Semantics

The `ga / gate` job will fail if **ANY** dependency job has a result other than `success`.

*   **Failure**: If a dependency fails.
*   **Skipped**: If a dependency is skipped (e.g., due to conditional logic that wasn't fulfilled, or dependency failure), the gate fails. This enforces "No Missing Signals".
*   **Cancelled**: If a dependency is cancelled.

## How to Interpret Results

The job output provides a summary table:

```text
### GA Gate Results
| Job | Result | Status |
|---|---|---|
| Lint | success | ✅ |
| Test | failure | ❌ |
...
```

If you see a ❌, inspect the corresponding granular job in the "Summary" view of the workflow run to diagnose the issue.

## Local Reproduction

To reproduce failures locally, use the corresponding commands:

*   **Lint**: `pnpm lint`
*   **Test**: `pnpm test:unit` / `pnpm test:integration`
*   **Verification**: `pnpm verify`
*   **Golden Path**: `make bootstrap && make up && make smoke`
*   **Security**: (Requires API keys) `make verify-security`

## Governance & Waivers

Currently, `ga / gate` does not support granular waivers. All signals must be green (or suppressed via `continue-on-error` in the workflow definition itself). To waive a failure, you must fix the underlying issue or (with approval) adjust the workflow configuration.
