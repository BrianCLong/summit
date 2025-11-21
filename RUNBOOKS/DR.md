# Disaster Recovery (DR) Runbook

This document outlines the procedures for backing up and restoring the `summit` platform's critical state in **development** and **staging** environments.

## Critical State

The platform's state consists of three critical components that must be backed up together to ensure consistency:

1.  **Relational Data (Postgres)**: Stores users, tenants, investigations metadata, trust scores, and risk signals.
    *   Database: `intelgraph_dev`
    *   Container: `postgres`
2.  **Graph Data (Neo4j)**: Stores the core intelligence graph (entities, relationships).
    *   Database: `neo4j`
    *   Container: `neo4j`
3.  **Evidence Files**: File artifacts (CSVs, STIX bundles) uploaded by users.
    *   Path: `server/uploads`

**Note**: Redis is considered ephemeral for DR purposes (queues can be drained/reset).

## Recovery Objectives (Dev/Staging)

*   **RPO (Recovery Point Objective)**: Since backups are manual/on-demand, data loss is equal to the time since the last script execution.
*   **RTO (Recovery Time Objective)**: < 10 minutes (time to run restore script + service restart).

## Backup Procedure

The backup script performs the following actions:
1.  Dumps the Postgres database (`pg_dump`).
2.  Stops Neo4j, performs an offline dump (`neo4j-admin dump`), and restarts Neo4j.
3.  Archives the `server/uploads` directory.
4.  Saves all artifacts to `backups/YYYYMMDD_HHMMSS/`.

**Usage:**

```bash
./scripts/backup/backup_dev.sh
```

**Output:**
A new directory under `backups/` containing:
- `postgres.dump`
- `neo4j.dump`
- `uploads.tar.gz`

## Restore Procedure

**WARNING**: The restore procedure is **destructive**. It will overwrite the current database state and replace evidence files.

The restore script performs the following actions:
1.  Drops and recreates the Postgres database, then loads the dump.
2.  Stops Neo4j, overwrites the database with the dump, and restarts Neo4j.
3.  Replaces `server/uploads` with the archived version.

**Usage:**

```bash
./scripts/backup/restore_dev.sh backups/<TIMESTAMP_DIR>
```

**Example:**

```bash
./scripts/backup/restore_dev.sh backups/20250925_120000
```

## Verification

After a restore, verify the system health:

1.  **Services**: Ensure all containers are running (`docker ps`).
2.  **Postgres**: Connect and check for recent data.
    ```bash
    docker exec -it postgres psql -U intelgraph -d intelgraph_dev -c "\dt"
    ```
3.  **Neo4j**: Connect and check node counts.
    ```bash
    docker exec -it neo4j cypher-shell -u neo4j -p dev_password "MATCH (n) RETURN count(n)"
    ```
4.  **Files**: Check if uploads exist.
    ```bash
    ls -F server/uploads/imports/
    ```

## Future Work (Production)

For a production-grade DR strategy, the following enhancements are required:

*   **Automation**: Scheduled cron jobs or Kubernetes CronJobs for periodic backups.
*   **Off-site Storage**: Push backup artifacts to S3/GCS/Azure Blob Storage.
*   **Encryption**: Encrypt backup artifacts at rest.
*   **PITR**: Enable Point-In-Time Recovery for Postgres (WAL archiving).
*   **Zero-Downtime**: Use Neo4j Enterprise Online Backup (if licensed) or causal clustering to avoid downtime during backup.
