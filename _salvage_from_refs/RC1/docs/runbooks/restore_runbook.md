# IntelGraph Restore Runbook

This runbook outlines the procedure for restoring the IntelGraph system's critical data stores: Redis, Neo4j, and PostgreSQL from previously created backups.

## Overview

Restoring IntelGraph involves stopping the affected database services, replacing their data with the backup, and then restarting them. This process is critical for disaster recovery and data integrity.

## Prerequisites

*   Docker and Docker Compose installed and running.
*   Access to the IntelGraph project directory.
*   **Existing backup files** for Redis (`.rdb`), Neo4j (`.dump`), and PostgreSQL (`.sql`).
*   Knowledge of the full path to the backup files you wish to restore.

## Restore Procedure

All restore scripts are located in the `./scripts/restore/` directory.

### Important Considerations:

*   **Data Loss:** Restoring a backup will overwrite the current data in the respective database. Ensure you have the correct backup file and understand the implications.
*   **Service Downtime:** The database services will be stopped during the restore process, leading to downtime for any applications depending on them.

### 1. Restore Redis

To restore the Redis database, execute the following script, providing the path to the `.rdb` backup file:

```bash
./scripts/restore/redis_restore.sh <path_to_redis_backup.rdb>
```

*   **Example:** `./scripts/restore/redis_restore.sh ./backups/redis/redis-20231027123456.rdb`
*   **Description:** This script stops the Redis container, copies the specified `.rdb` file into the container's data directory, and then restarts the Redis service.

### 2. Restore Neo4j

To restore the Neo4j graph database, execute the following script, providing the path to the `.dump` backup file:

```bash
./scripts/restore/neo4j_restore.sh <path_to_neo4j_backup.dump>
```

*   **Example:** `./scripts/restore/neo4j_restore.sh ./backups/neo4j/neo4j-backup-20231027123456.dump`
*   **Description:** This script stops the Neo4j container, clears its existing data, copies the `.dump` file into the container, uses `neo4j-admin load` to restore the database, and then restarts the Neo4j service.

### 3. Restore PostgreSQL

To restore the PostgreSQL relational database, execute the following script, providing the path to the `.sql` backup file:

```bash
./scripts/restore/postgres_restore.sh <path_to_postgres_backup.sql>
```

*   **Example:** `./scripts/restore/postgres_restore.sh ./backups/postgres/postgres-backup-20231027123456.sql`
*   **Description:** This script stops the PostgreSQL container, removes its data volume (simulating data loss and ensuring a clean state), restarts the service to re-initialize the volume, copies the `.sql` file into the container, and then uses `psql` to restore the database.

## Post-Restore Verification

After performing the restore operations, it is crucial to verify the integrity of the restored data and the functionality of the IntelGraph system.

1.  **Start IntelGraph Services:** If not already running, start all IntelGraph services using the main startup script:
    ```bash
    ./start.sh
    ```

2.  **Check Service Health:** Observe the output of `start.sh` for health checks. You can also manually check Docker container status:
    ```bash
    docker-compose -f docker-compose.dev.yml ps
    ```

3.  **Application Access:** Access the IntelGraph frontend (usually at `http://localhost:3000`) and verify that the application loads correctly.

4.  **Data Validation:** Perform specific checks to ensure your data has been restored correctly. This might involve:
    *   Logging into the application with known credentials.
    *   Navigating to sections that display data you expect to see.
    *   Running queries against the restored databases (e.g., via Adminer at `http://localhost:8080` or directly via `psql`/`cypher-shell` if configured).

