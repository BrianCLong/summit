# Audit Ledger Operations

## 1. Backup & Restore

*   **Ledger Location**: `summit/governance/ledger/store.py` (file-based).
*   **Backup**: Regular snapshot of the JSONL file.
*   **Restore**: Restore file from snapshot. Run `LedgerStore.verify()` immediately after restore.

## 2. Verification Runbooks

*   **Routine Check**: Run verification script daily.
*   **Alerting**: If `verify()` returns False, raise SEV-1 alert "Audit Ledger Tampering Detected".
*   **Investigation**:
    *   Compare failing chain against backups.
    *   Identify the first event where hash mismatch occurs.

## 3. Retention

*   **Policy**: Defined in `tiers.yaml` (e.g., High Risk = 3650 days).
*   **Archiving**: Move events older than X days to cold storage (S3 Glacier).
*   **Legal Hold**: Flag events to prevent purging.

## 4. Monitoring

*   **Metrics**:
    *   `ledger_append_count`
    *   `ledger_verify_failure_count`
    *   `policy_deny_count`
    *   `approval_required_count`
*   **Alerts**:
    *   `ledger_verify_failure_count > 0` -> Critical.
    *   `policy_deny_count > Threshold` -> Warning (Possible attack).
