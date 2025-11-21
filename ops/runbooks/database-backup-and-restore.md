# Database Backup and Restore Automation Runbook

## Overview
This runbook describes how to deploy the automated PostgreSQL and Neo4j backup processes, verify the resulting artifacts, and execute a controlled restore during a disaster recovery (DR) event.

## Prerequisites
- Kubernetes cluster access with permissions to create `CronJob`, `ConfigMap`, `Secret`, and `ServiceAccount` resources in the `data` namespace (or update the manifests to match your namespace).
- AWS S3 bucket (or S3-compatible object storage) and access keys dedicated to database backups.
- `kubectl`, `aws` CLI, `psql`, and `neo4j-admin` binaries available on the workstation used for validation and restores.
- Network connectivity from the backup jobs to the database services.

## Configuration
1. **Create AWS credential secret**
   ```bash
   kubectl create secret generic database-backup-storage \
     --namespace data \
     --from-literal=S3_BUCKET=<bucket-name> \
     --from-literal=AWS_DEFAULT_REGION=<region> \
     --from-literal=AWS_ACCESS_KEY_ID=<key> \
     --from-literal=AWS_SECRET_ACCESS_KEY=<secret>
  ```
   Include `--from-literal=AWS_ENDPOINT_URL=<url>` when using an S3-compatible provider.
2. **Create database credential secrets**
   ```bash
   kubectl create secret generic postgres-backup-credentials \
     --namespace data \
     --from-literal=POSTGRES_HOST=<hostname> \
     --from-literal=POSTGRES_PORT=5432 \
     --from-literal=POSTGRES_DATABASE=<database> \
     --from-literal=POSTGRES_USER=<user> \
     --from-literal=POSTGRES_PASSWORD=<password>

   kubectl create secret generic neo4j-backup-credentials \
     --namespace data \
     --from-literal=NEO4J_HOST=<hostname> \
     --from-literal=NEO4J_BOLT_PORT=7687 \
     --from-literal=NEO4J_DATABASE=<database> \
     --from-literal=NEO4J_USERNAME=<user> \
     --from-literal=NEO4J_PASSWORD=<password>
   ```
3. **Create configuration map for S3 prefixes**
   ```bash
   kubectl create configmap database-backup-settings \
     --namespace data \
     --from-literal=POSTGRES_S3_PREFIX=postgres/ \
     --from-literal=NEO4J_S3_PREFIX=neo4j/
   ```
4. **Publish the backup scripts as a ConfigMap**
   ```bash
   kubectl create configmap database-backup-scripts \
     --namespace data \
     --from-file=postgres-backup.sh=ops/db/backup-jobs/scripts/postgres-backup.sh \
     --from-file=neo4j-backup.sh=ops/db/backup-jobs/scripts/neo4j-backup.sh
   ```
   Re-run the command with `--dry-run=client -o yaml | kubectl apply -f -` to update the ConfigMap after script changes.
5. **Service account (optional)**
   ```bash
   kubectl create serviceaccount database-backup --namespace data
   ```

## Deploying the CronJobs
Apply the CronJob manifest after preparing the supporting resources:
```bash
kubectl apply -f ops/db/backup-jobs/cronjobs.yaml
```
The PostgreSQL job runs daily at 02:00 UTC, while the Neo4j job runs daily at 02:30 UTC. Adjust the `schedule` fields to match your maintenance window.

## Synthetic Data Test Plan
Perform this validation when first enabling the jobs and after significant database upgrades.

### PostgreSQL
1. Seed the database with synthetic data:
   ```bash
   psql "postgresql://<user>:<password>@<host>:<port>/<database>" \
     --command="CREATE TABLE IF NOT EXISTS backup_validation(id SERIAL PRIMARY KEY, note TEXT);"
   psql "postgresql://<user>:<password>@<host>:<port>/<database>" \
     --command="INSERT INTO backup_validation(note) VALUES('$(date -u +%FT%TZ) synthetic check');"
   ```
2. Trigger the CronJob manually:
   ```bash
   kubectl create job --from=cronjob/postgres-daily-backup postgres-backup-test --namespace data
   ```
3. Confirm the S3 object exists and contains the new entry:
   ```bash
   aws s3 ls s3://<bucket>/postgres/
   aws s3 cp s3://<bucket>/postgres/<latest-backup>.sql.gz - | gunzip | grep backup_validation
   ```
4. Delete the ad-hoc job after completion:
   ```bash
   kubectl delete job postgres-backup-test --namespace data
   ```

### Neo4j
1. Insert synthetic data (example using cypher-shell):
   ```bash
   cypher-shell -a neo4j+s://<host>:<port> -u <user> -p <password> \
     "MERGE (n:BackupValidation {id: 'synthetic'}) SET n.checkedAt = datetime()"
   ```
2. Trigger the CronJob manually:
   ```bash
   kubectl create job --from=cronjob/neo4j-daily-backup neo4j-backup-test --namespace data
   ```
3. Validate the archive:
   ```bash
   aws s3 ls s3://<bucket>/neo4j/
   aws s3 cp s3://<bucket>/neo4j/<latest-backup>.backup.tar.gz - | tar -tzf - | head
   ```
4. Delete the ad-hoc job:
   ```bash
   kubectl delete job neo4j-backup-test --namespace data
   ```

## Restore Procedures

### PostgreSQL Restore
1. Identify the desired backup object and export its URI, for example:
   ```bash
   export RESTORE_S3_URI=s3://<bucket>/postgres/<timestamp>.sql.gz
   ```
2. Stop application writes or enable maintenance mode.
3. Run the restore script from a bastion host or Kubernetes job:
   ```bash
   AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> \
   POSTGRES_HOST=<host> POSTGRES_PORT=5432 POSTGRES_DATABASE=<database> \
   POSTGRES_USER=<user> POSTGRES_PASSWORD=<password> \
   RESTORE_S3_URI=${RESTORE_S3_URI} CLEAN_TARGET=true \
   bash ops/db/backup-jobs/scripts/postgres-restore.sh
   ```
4. Validate the restored data using targeted queries.

### Neo4j Restore
> **Note:** Neo4j must be stopped prior to running `neo4j-admin database load`.

1. Export the backup URI and stop the cluster member.
2. Run the restore script on the host that owns the data directory:
   ```bash
   AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> \
   RESTORE_S3_URI=s3://<bucket>/neo4j/<timestamp>.backup.tar.gz \
   NEO4J_DATABASE=<database> NEO4J_HOME=/var/lib/neo4j \
   bash ops/db/backup-jobs/scripts/neo4j-restore.sh
   ```
3. Start Neo4j and verify cluster health with `neo4j status` and targeted Cypher queries.

## Disaster Recovery Validation
- Restore to an isolated environment quarterly using the latest backups.
- Execute smoke tests against critical application queries.
- Document recovery time objective (RTO) and recovery point objective (RPO) metrics after each drill.

## Troubleshooting
- **`aws` command not found** – ensure the CronJob image installs `awscli` (included in the manifest via `apt-get`) and that validation hosts have the AWS CLI available.
- **Permission denied** – confirm the service account has IAM permissions (`s3:PutObject`, `s3:GetObject`, `s3:ListBucket`).
- **Neo4j backup failures** – verify that the `backup` role is enabled on the target server and that the configured port is reachable.
- **Slow backups** – adjust schedules or use incremental backups by setting the `NEO4J_BACKUP_MODE` environment variable to `incremental` in the CronJob or ad-hoc job.
