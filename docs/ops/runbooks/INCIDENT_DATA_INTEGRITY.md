# Runbook: Data Integrity Incidents

## 1. Symptoms

- **Alert:** `DataValidationFailure`, `BackupVerificationFailed`
- **User Report:** "My data is missing" or "I see someone else's data" (Critical).
- **Logs:** Foreign Key constraint violations, "Corrupt data" errors.

## 2. Immediate Containment

1.  **Stop Writes (Read-Only Mode):**
    Prevent further corruption.
    ```bash
    ./scripts/incident/containment.sh --action maintenance_mode --read-only true
    ```
2.  **Isolate Affected Tenant:**
    If isolated to one tenant, lock only them.
    ```bash
    ./scripts/ops/lock-tenant.ts --tenant-id <id>
    ```

## 3. Diagnostics

- **Verify Provenance:**
  Check the `provenance_ledger` to see the history of the corrupted record.
- **Compare with Backup:**
  Check the last known good backup.
  ```bash
  ./scripts/ops/check-backup.ts --date yesterday
  ```

## 4. Mitigation & Recovery

- **Point-in-Time Recovery (PITR):**
  Restore database to state before corruption event. (Last Resort)
- **Data Patching:**
  If scope is small, manually correct data via script (requires dual-approval).
  ```bash
  ./scripts/ops/apply-data-fix.ts --script fix_xyz.sql
  ```

## 5. Escalation

- Escalate to **CTO** immediately. Data corruption is an existential threat.

## 6. Post-Incident

1.  Verify all recovered data.
2.  Add checksum validation to prevent recurrence.
3.  Notify affected customers transparently.
