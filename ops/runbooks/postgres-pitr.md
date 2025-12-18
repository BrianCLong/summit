# PostgreSQL Point-in-Time Recovery (PITR) Automation

This runbook describes how to operate the automated PostgreSQL backup and point-in-time recovery pipeline using the WAL-G powered `postgres-pitr` image and Kubernetes jobs.

## Components
- **Base backup CronJob**: `k8s/postgres-pitr/base-backup-cronjob.yaml` runs daily WAL-G base backups to the configured object storage bucket.
- **PITR restore job**: `k8s/postgres-pitr/restore-job.yaml` hydrates a data volume from a selected backup and prepares PostgreSQL to recover to a specified timestamp.
- **WAL archiving**: `services/postgres-pitr/config/postgresql-pitr.conf` enables `archive_command` and `restore_command` hooks with WAL-G so WAL segments needed for PITR land in the same storage prefix.

## Prerequisites
- Access to the Kubernetes cluster namespace where PostgreSQL runs (defaults to `summit`).
- S3 (or S3-compatible) bucket and IAM/credentials for WAL-G (`s3-credentials` secret supplying `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`).
- PostgreSQL credentials secret (`postgres-credentials`) containing `username` and `password` keys.
- PersistentVolumeClaim named `postgres-data` bound to the target PostgreSQL data volume.
- `kubectl` and `jq` available locally.

## Enable Continuous Backup
1. Apply the WAL-G config map (edit values to match your storage prefix and region):
   ```bash
   kubectl apply -f k8s/postgres-pitr/base-backup-cronjob.yaml
   ```
2. Mount `services/postgres-pitr/config/postgresql-pitr.conf` into the PostgreSQL StatefulSet as an include file and set `archive_mode=on`. The file already defines:
   ```
   archive_command = '/usr/local/bin/wal-archive.sh %p %f'
   restore_command = '/usr/local/bin/wal-restore.sh %f %p'
   wal_level = replica
   archive_timeout = 60
   ```
3. Restart PostgreSQL so the WAL archiving settings take effect.

## Running the PITR Restore Job
1. Pick the target restore timestamp (ISO 8601) and optional backup name visible from `wal-g backup-list`.
2. Patch the job manifest with your values (example writes to `restore-job.yaml` without mutating the tracked file):
   ```bash
   export TARGET_TIME="2025-02-10T14:30:00Z"
   export BACKUP_NAME="LATEST"  # or specific backup id
   yq eval \
     '.spec.template.spec.containers[0].env |= map(
       if .name == "TARGET_TIME" then .value = env(TARGET_TIME)
       elif .name == "BACKUP_NAME" then .value = env(BACKUP_NAME)
       else . end
     )' k8s/postgres-pitr/restore-job.yaml > /tmp/restore-job.yaml
   ```
3. Launch the job:
   ```bash
   kubectl apply -f /tmp/restore-job.yaml
   kubectl logs -f job/postgres-pitr-restore -n summit
   ```
4. Once the job completes, attach the hydrated volume to PostgreSQL and start the instance. If `AUTO_START=true` is provided, the job will start PostgreSQL inside the restore pod to finish replay and promotion automatically.

## Validation Checklist
- `kubectl get jobs -n summit` shows `postgres-pitr-restore` in `Complete`.
- WAL-G logs contain successful `backup-fetch` and WAL fetch entries up to the requested timestamp.
- Application smoke tests against the recovered database succeed and data matches the expected point in time.
- Confirm `postgres_base_backup_last_success_timestamp` metrics (Pushgateway) remain healthy after enabling the CronJob.

## Cleanup
- Delete completed restore jobs after validation: `kubectl delete job postgres-pitr-restore -n summit`.
- Rotate backups and WAL archives with `wal-g delete retain FULL <count> --confirm` if additional retention tuning is required.
