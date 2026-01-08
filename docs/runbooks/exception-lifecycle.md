# Exception Lifecycle Management Runbook

## Overview
This runbook describes the "Exception Lifecycle Management" system, which tracks, monitors, and reports on exceptions (e.g., break-glass overrides, policy exceptions, gate demotions) to ensure they are temporary and auditable.

## System Components

### 1. Sources of Truth
*   `ci/break-glass/overrides.jsonl`: Logs of break-glass events.
*   `ci/decision-log/decisions.jsonl`: Records of policy decisions and exceptions.
*   `ci/exception-lifecycle-policy.yml`: Configuration defining exception types, TTLs, and enforcement rules.

### 2. Artifacts (`dist/exceptions/`)
*   `exceptions.json`: Canonical machine-readable list of all tracked exceptions with normalized status.
*   `sunset-report.json`: Summary statistics and actionable items.
*   `sunset-report.md`: Human-readable report highlighting violations and expiring items.
*   `proofs/source-index.json`: Hash bindings of input sources for auditability.

### 3. Workflow
The `.github/workflows/exception-lifecycle.yml` runs weekly to:
1.  Validate the policy file.
2.  Aggregate exceptions from sources.
3.  Generate the sunset report.
4.  Verify no sensitive data leaks.
5.  Upload artifacts.
6.  (Optional) Fail the build if `enforcement_mode` is set to `fail_on_violation`.

## Exception States

*   **ACTIVE**: Exception is valid and within its allowed timeframe.
*   **WARNING**: Exception is expiring soon (within 7 days).
*   **OVERDUE**: Exception has expired but is within the grace period.
*   **VIOLATION**: Exception has expired and exceeded the grace period. Immediate action required.
*   **CLOSED**: Exception is resolved (if closure logic is applied).

## Handling Violations

If you receive a notification or see a VIOLATION in the report:

1.  **Check the Report**: Look at `sunset-report.md` (artifact) to identify the `exception_id`.
2.  **Determine Action**:
    *   **If no longer needed**: Remove the entry from the source file (or mark as closed if supported).
    *   **If still needed**: You must "renew" it. This typically means creating a *new* entry in the decision log or break-glass log with a current timestamp and fresh rationale. **Do not simply edit the old timestamp.**
3.  **Verify**: Run the local script to ensure the violation is cleared.
    ```bash
    npx tsx scripts/reporting/collect_exceptions.ts
    npx tsx scripts/reporting/build_exception_sunset_report.ts
    ```

## Configuration

Edit `ci/exception-lifecycle-policy.yml` to adjust:
*   `max_ttl_days`: How long an exception can live.
*   `grace_period_days`: How long after expiry before it becomes a violation.
*   `enforcement_mode`: Set to `fail_on_violation` to block CI/CD pipelines when violations exist.

## Troubleshooting

*   **Script Failures**: Ensure dependencies (`tsx`, `zod`, `js-yaml`) are installed.
*   **Leak Detection**: If the verification step fails, check if you included sensitive data in `rationale` fields. Use references (IDs) instead of raw secrets.
