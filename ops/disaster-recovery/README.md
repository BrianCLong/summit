# Disaster Recovery System

This package delivers an end-to-end disaster recovery capability for PostgreSQL workloads, covering automated backups, point-in-time recovery (PITR), cross-region replication, failover automation, verification testing, and operational runbooks.

## Components
- **Architecture**: See `architecture.md` for topology, RPO/RTO targets, security controls, and drills.
- **Policies**: `config/backup-policy.yaml` codifies schedules, retention tiers, replication, and observability expectations.
- **Automation**:
  - `scripts/backup_runner.sh`: Generates encrypted base backups, syncs WAL archives, and emits metrics.
  - `scripts/backup_verify.sh`: Restores the latest backup into a sandbox to validate checksums and run smoke queries.
- **Runbooks**: `runbooks/recovery-runbook.md` defines PITR, cross-region failover, verification, and rollback steps.

## Usage
1. Export environment variables for PostgreSQL and AWS (or compatible object storage) before running scripts. Example:
   ```bash
   export PGHOST=db-primary.internal \ \
          PGUSER=backup \ \
          PGDATABASE=app \ \
          BACKUP_BUCKET=s3://app-prod-db-backups \ \
          WAL_BUCKET=s3://app-prod-db-wal \ \
          AWS_REGION=us-east-1 \ \
          KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/abcd
   ```
2. Run `ops/disaster-recovery/scripts/backup_runner.sh` on the desired schedule (cron/Kubernetes CronJob/systemd timer).
3. Run `ops/disaster-recovery/scripts/backup_verify.sh` nightly or on-demand for validation.
4. Follow `runbooks/recovery-runbook.md` during incidents or drills to execute PITR and failover safely.

## Observability
- Emit metrics to your telemetry stack (Prometheus/OpenTelemetry) using script output or sidecar exporters.
- Alerts: backup/verification failure (critical), replica lag > 900s, replication disabled, RPO breach.

## Compliance & Safety
- No secrets are stored on disk; scripts expect environment injection.
- Backups use KMS encryption and checksum validation to guard integrity and confidentiality.
- Lifecycle policies and versioning prevent accidental deletion; replication protects against regional loss.
