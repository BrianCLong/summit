# IntelGraph Backup Runbook

This runbook outlines the procedure for performing a backup of the IntelGraph system's critical data stores: Redis, Neo4j, and PostgreSQL.

## Overview

IntelGraph utilizes Docker Compose for local development and deployment. Backups are performed using dedicated scripts that interact with the Docker containers to extract data. The backup process is designed to be non-disruptive to running services, though for Neo4j and PostgreSQL, it's recommended to perform backups during periods of low activity if possible.

## Prerequisites

*   Docker and Docker Compose installed and running.
*   IntelGraph services are running (or at least the database services you intend to back up).
*   Access to the IntelGraph project directory.

## Backup Procedure

All backup scripts are located in the `./scripts/backup/` directory.

### 1. Backup Redis

To back up the Redis database, execute the following script:

```bash
./scripts/backup/redis_backup.sh
```

*   **Description:** This script uses `redis-cli BGSAVE` to create a snapshot of the Redis database (`dump.rdb`) and copies it to the host's `./backups/redis` directory. Each backup is timestamped.
*   **Output:** A message indicating the backup file location.
*   **Backup Location:** `./backups/redis/redis-<TIMESTAMP>.rdb`

### 2. Backup Neo4j

To back up the Neo4j graph database, execute the following script:

```bash
./scripts/backup/neo4j_backup.sh
```

*   **Description:** This script uses `docker-compose exec` to run `neo4j-admin dump` inside the Neo4j container. The dump file is saved to the host's `./backups/neo4j` directory.
*   **Output:** Messages indicating the progress and the backup file location.
*   **Backup Location:** `./backups/neo4j/neo4j-backup-<TIMESTAMP>.dump`

### 3. Backup PostgreSQL

To back up the PostgreSQL relational database, execute the following script:

```bash
./scripts/backup/postgres_backup.sh
```

*   **Description:** This script uses `docker-compose exec` to run `pg_dump` inside the PostgreSQL container. The SQL dump file is saved to the host's `./backups/postgres` directory.
*   **Output:** Messages indicating the progress and the backup file location.
*   **Backup Location:** `./backups/postgres/postgres-backup-<TIMESTAMP>.sql`

## Automated Backup (Optional)

These scripts can be integrated into a cron job or a CI/CD pipeline for automated, regular backups. Ensure that the environment variables (e.g., `REDIS_PASSWORD`, `POSTGRES_PASSWORD`) are correctly set in the execution environment if not using the default development values.

## Verification

After running the backup scripts, verify that the backup files exist in their respective `./backups/` subdirectories and that their sizes are reasonable (i.e., not zero bytes).

