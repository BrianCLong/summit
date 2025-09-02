# Backup and Restore Runbook

This runbook details the procedures for backing up and restoring the Maestro platform's data. It covers daily snapshots, weekly basebackups, S3 versioned snapshots, and configuration backups, along with the quarterly restore drill process.

## 1. Backup Schedule and Automation

### 1.1. PostgreSQL Backups

- **Daily Snapshots**: Automated daily snapshots of the PostgreSQL database are taken and retained for 7 days. These are typically managed by the cloud provider's RDS service or a dedicated backup solution for self-managed instances.
  - **Method**: Cloud Provider Snapshots (e.g., AWS RDS Snapshots) or `pg_dump` for logical backups.
  - **Retention**: 7 days.
- **Weekly Basebackups**: Full basebackups are taken weekly and retained for a longer period (e.g., 30 days).
  - **Method**: `pg_basebackup` or cloud provider's continuous backup (PITR - Point-In-Time Recovery).
  - **Retention**: 30 days.
- **Encryption**: All PostgreSQL backups are encrypted at rest using KMS Customer Master Keys (CMKs).

### 1.2. S3 Artifacts Backups

- **S3 Versioning**: All critical S3 buckets (e.g., for build artifacts, evidence) have versioning enabled to protect against accidental deletion or overwrites.
- **Lifecycle Policies**: S3 lifecycle rules are applied to manage the transition of non-WORM artifacts to lower-cost storage classes (e.g., Glacier) and eventual expiration.
  - **Artifacts**: `artifacts/` prefix transitions to `STANDARD_IA` at 30 days, `GLACIER` at 90 days, expires at 180 days.
  - **Evidence (WORM)**: `evidence/` prefix is stored in an S3 Object Lock enabled bucket, ensuring immutability for a defined retention period (e.g., 90 days minimum). After the lock expires, objects are archived to `DEEP_ARCHIVE`.

### 1.3. Configuration Backups

- **Scope**: Policies, routing pins, and secrets metadata (excluding actual secrets) are backed up.
- **Method**: Version control (Git) for IaC and configuration files; automated daily sync to a secure, versioned S3 bucket for dynamic configurations.
- **Location**: Encrypted S3 bucket with restricted access.

## 2. Restore Drill Procedure

Quarterly, a restore drill is performed on a staging environment to verify RTO (Recovery Time Objective) and RPO (Recovery Point Objective) targets.

### 2.1. Restore Checklist

- [ ] **1. Isolate Staging Environment**: Ensure the staging environment is isolated from production to prevent data corruption.
- [ ] **2. Select Backup**: Choose a recent backup (snapshot or basebackup) for restoration.
- [ ] **3. Restore Database**: Recover the PostgreSQL database from the selected snapshot/basebackup.
  - **Commands**: `(Example: pg_restore -d new_db_name -F c backup_file.dump)`
  - **Verification**: Connect to the restored DB and verify basic data integrity.
- [ ] **4. Restore Artifacts Index**: If applicable, restore the index for S3 artifacts to ensure metadata consistency.
- [ ] **5. Replay Recent Events (if needed)**: For PITR, replay transaction logs to reach the desired recovery point.
- [ ] **6. Restore Configuration**: Apply backed-up configurations (policies, routing pins).
- [ ] **7. Run Smoke Tests**: Execute a suite of smoke tests against the restored environment to verify functionality.
  - **CI Job**: `dr-restore-smoke` CI job is triggered to automate this step.
- [ ] **8. Verify RTO/RPO**: Measure the time taken for recovery and the amount of data loss to confirm RTO/RPO targets are met.
- [ ] **9. Document Findings**: Record all steps, challenges, and successes in a drill report.
- [ ] **10. Clean Up**: Dismantle the restored environment.

### 2.2. RTO/RPO Targets

- **RTO (Recovery Time Objective)**: [Specify, e.g., 4 hours for critical services, 24 hours for non-critical].
- **RPO (Recovery Point Objective)**: [Specify, e.g., 15 minutes for critical data, 4 hours for non-critical].

## 3. KMS Key Rotation

KMS Customer Master Keys (CMKs) used for encryption are rotated automatically (if AWS managed) or manually (if customer managed) annually. Post-rotation, systems are validated to ensure decryption with new key versions functions correctly.

## 4. Audit and Compliance

All backup and restore operations are logged and audited for compliance purposes. Regular audits ensure adherence to this runbook and relevant security policies.
