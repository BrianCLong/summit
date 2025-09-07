# Disaster Recovery Runbook

Backups:

- Neo4j: nightly full + hourly incremental via CronJob (`k8s/backups/neo4j-backup-cronjob.yaml`).
- Postgres: nightly `pg_dump` gzip (`k8s/backups/postgres-backup-cronjob.yaml`).
- Redis: RDB every 6h + AOF in Redis values (`helm/redis/values.yaml`).

Restore procedures:

- Neo4j: download dump from S3, `neo4j-admin database load neo4j --from-path=/path`.
- Postgres: `gunzip -c dump.sql.gz | psql` into a clean database.
- Redis: stop instance, replace `dump.rdb`, start; or `redis-cli --pipe` if AOF used.

Aurora Postgres (Cross-Region DR)

- Terraform outputs (module `terraform/aurora`):
  - `cluster_endpoint`, `reader_endpoint`, `cluster_arn`, `cluster_id`, `kms_key_arn`.
- Cross-region replica:
  - Create DR cluster with `replication_source_identifier = <cluster_arn>` in the DR region.
  - Ensure KMS in DR permits decrypt (grant on `kms_key_arn` or use multi-Region key).
  - During DR, promote the replica; update `DATABASE_URL` to DR endpoint.
  - After recovery, plan failback (snapshot+restore or re-replicate).

Verification:

- Smoke tests for API and critical flows.
- Check Grafana dashboards and Alertmanager silence windows.
