# Runbook: KMS Key Rotation and PII Backfill

**Owner:** Data Governance / Security Team

**Related Alerts:** `KmsKeyRotationNeeded`, `PiiBackfillJobFailed`

---

## 1. Overview

This runbook covers two critical, related procedures:

1.  **KMS Key Encryption Key (KEK) Rotation:** The process of generating a new master key in the KMS used to wrap the Data Encryption Keys (DEKs).
2.  **PII Field Backfill/Rewrap:** The process of re-encrypting data (either the DEK or the field itself) with a new KEK after a rotation.

## 2. KEK Rotation Procedure

This procedure should be performed periodically (e.g., every 90-365 days) or on-demand in case of a security event.

### 2.1. Pre-flight Checks

1.  **Confirm System Health:** Ensure all services are operational and there are no active incidents.
2.  **Announce Maintenance Window:** Announce a maintenance window if downtime is expected (though the goal is a zero-downtime rotation).
3.  **Verify KMS Access:** Ensure you have the necessary IAM permissions to perform key rotation in the target KMS (AWS KMS, Vault, etc.).

### 2.2. Execution (via GraphQL Mutation)

1.  **Navigate to the Governance Tab** in the IntelGraph UI.
2.  **Click "Rotate Encryption Keys".**
3.  **Provide a reason for the rotation in the modal.** This reason is logged in the audit trail (e.g., "Q3 2025 scheduled rotation").
4.  **Click "Confirm & Rotate".**

### 2.3. Verification

1.  **Check Mutation Result:** The UI should show a success toast with the new Key ID (`keyId`) and the number of keys rotated.
2.  **Check Audit Logs:** A `KEY_ROTATION_PERFORMED` event should appear in the system's audit logs.
3.  **Test Decryption:** Manually retrieve a newly-encrypted piece of data and confirm it can be decrypted successfully. The `getEntityEmail` function in the `caseEntityDao` can be used for this.

## 3. PII Field Re-encryption (Backfill Job)

After a KEK rotation, existing Data Encryption Keys (DEKs) stored in the database are still encrypted with the *old* KEK. The `rewrapDek` function handles this lazily, but a full backfill is required to ensure all data is protected by the new KEK.

This is a background job that should be triggered manually after a successful key rotation.

### 3.1. Triggering the Job

```bash
# This is a conceptual command. The actual implementation may be a script or API call.
node ./scripts/run-job.js --job=pii-rewrap-backfill --newKeyAlias=tenant/all/pii
```

### 3.2. Monitoring the Job

1.  **Check Job Logs:** Monitor the logs for the background job runner. Look for progress indicators and any errors.
    *   `INFO: Starting PII re-wrap backfill for 1,234,567 records.`
    *   `INFO: Progress: 500,000 / 1,234,567 re-wrapped.`
    *   `ERROR: Failed to re-wrap DEK for record_id: xyz-abc. Error: ...`
2.  **Check Database:** The `pii_email_kid` and `pii_email_dek` columns in the `case_entity` table should be updated as the job progresses.

### 3.3. Handling Failures

*   The job is designed to be idempotent and resumable. If it fails, it can be restarted.
*   Individual record failures will be logged. These should be investigated manually. The most common cause is a missing or corrupt DEK.

## 4. Rollback Procedure

*   **KEK Rotation:** In most KMS systems, the old KEK is not deleted but disabled. In an emergency, the old key can be re-enabled, and the application can be configured to use the previous `keyId` for decryption.
*   **Backfill Job:** The backfill job does not have a simple rollback. It is a forward-only process. A database backup from before the job started would be the primary recovery mechanism in a catastrophic failure.
