# Backup Verification Automation Guide

This runbook explains how to deploy and operate the automated PostgreSQL and Neo4j backup verification pipeline that runs inside Kubernetes. The workflow downloads the most recent snapshots from S3, restores them into disposable sandboxes, executes synthetic workload checks, and raises Prometheus alerts when verification fails or stalls.

## Architecture Overview

1. **CronJobs** defined in [`ops/deployment/backup-verification-cronjobs.yaml`](../../ops/deployment/backup-verification-cronjobs.yaml) run nightly.
2. Each CronJob mounts shell scripts from the `backup-verification-scripts` ConfigMap. The scripts live in [`ops/backup-verification`](../../ops/backup-verification) for version control and include:
   - [`postgres-backup-verify.sh`](../../ops/backup-verification/postgres-backup-verify.sh) – restores a snapshot with `pg_restore`, runs schema checks, and validates user tables.
   - [`neo4j-backup-verify.sh`](../../ops/backup-verification/neo4j-backup-verify.sh) – restores a Neo4j backup, performs an offline consistency check, and runs a small Cypher workload.
3. Prometheus alert rules in [`ops/prometheus/backup-verification-rules.yaml`](../../ops/prometheus/backup-verification-rules.yaml) watch the CronJob metrics published by kube-state-metrics.

## Prerequisites

- Kubernetes cluster with access to the S3 buckets that store production backups.
- AWS credentials with read access to the backup prefixes.
- `kube-state-metrics` scraping CronJob metrics.
- Prometheus and Alertmanager in place to evaluate and route alerts.

## Configuration

1. **Update ConfigMap values**
   - Edit `AWS_REGION`, `POSTGRES_S3_BUCKET`, `POSTGRES_BACKUP_PREFIX`, `NEO4J_S3_BUCKET`, `NEO4J_BACKUP_PREFIX`, and `NEO4J_DATABASE` in `backup-verification-env` to match your environment.
   - Optionally set `POSTGRES_LATEST_KEY` or `NEO4J_LATEST_KEY` to force verification of a particular backup object.
2. **Populate AWS credentials**
   - Replace `REPLACE_ME` values in the `backup-verifier-aws` Secret with the Access Key ID and Secret Access Key for the verification IAM user. Consider switching to IRSA or service account annotations if you use EKS and IAM roles.
3. **Namespace and RBAC**
   - Apply the manifests in the desired namespace (e.g. `kubectl apply -n data-platform -f ops/deployment/backup-verification-cronjobs.yaml`).
   - Bind the `backup-verifier` ServiceAccount to a Role/ClusterRole that allows reading referenced secrets and configmaps, and optionally to IAM roles if using IRSA.

## Deployment Steps

1. Apply the CronJob stack:
   ```sh
   kubectl apply -n <namespace> -f ops/deployment/backup-verification-cronjobs.yaml
   ```
2. Deploy the Prometheus alert rule:
   ```sh
   kubectl apply -n <prometheus-namespace> -f ops/prometheus/backup-verification-rules.yaml
   ```
3. Verify resources:
   ```sh
   kubectl get cronjobs -n <namespace>
   kubectl describe cronjob postgres-backup-verification -n <namespace>
   kubectl describe cronjob neo4j-backup-verification -n <namespace>
   ```

## Synthetic Verification Details

### PostgreSQL

- Downloads the latest dump file from `s3://$POSTGRES_S3_BUCKET/$POSTGRES_BACKUP_PREFIX` (or a specific key if supplied).
- Runs `pg_restore --list` to validate archive integrity.
- Bootstraps an ephemeral cluster with `initdb` and restores into a temporary database via `pg_restore`.
- Runs `SELECT 1` and counts user tables to ensure restored schema is populated.

### Neo4j

- Downloads the latest `.tar.gz` backup bundle from `s3://$NEO4J_S3_BUCKET/$NEO4J_BACKUP_PREFIX`.
- Restores the backup into a scratch database with `neo4j-admin database restore`.
- Executes `neo4j-admin database check` to detect store-level corruption.
- Launches a transient `neo4j console` instance pointed at the scratch database and executes a lightweight Cypher query via `cypher-shell`.

## Monitoring and Alerting

Prometheus evaluates two alerts:

- **BackupVerificationFailed (critical):** fires when any verification Job fails within the most recent six hours.
- **BackupVerificationStale (warning):** fires when neither CronJob has started in the last 25 hours (allowing a buffer for maintenance).

Integrate these alerts into Alertmanager routing so the on-call team is paged for failures and notified for stale runs.

## Operational Tips

- Check job logs with `kubectl logs job/<job-name> -n <namespace>` when alerts fire.
- To rerun verification manually, use `kubectl create job --from=cronjob/<name> <name>-manual-$(date +%s)`.
- Keep the scripts under version control and redeploy the ConfigMap whenever they change: `kubectl create configmap backup-verification-scripts --from-file=ops/backup-verification/ -o yaml --dry-run=client | kubectl apply -f -`.
- Consider tuning resource requests if restorations routinely approach limits, especially for large Neo4j stores.

