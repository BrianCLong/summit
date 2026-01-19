# Backup & Disaster Recovery

This directory contains scripts for backing up the core Summit data stores: PostgreSQL and Redis.

## Scripts

### `backup_postgres.sh`
Uses `pg_dump` to create a compressed backup of the Postgres database.
*   **Env Vars:** `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_DB`, `BACKUP_DIR`

### `backup_redis.sh`
Triggers a `BGSAVE` on Redis and attempts to copy the `dump.rdb` and `appendonly.aof` files.
*   **Env Vars:** `REDIS_HOST`, `REDIS_PORT`, `BACKUP_DIR`, `REDIS_DATA_DIR`
*   *Note:* `REDIS_DATA_DIR` must point to the location where the Redis volume is mounted on the host/runner.

### `upload_to_storage.sh`
A mock script demonstrating how backups should be offloaded to cloud storage (e.g., S3).

## Disaster Recovery Procedure

1.  **Postgres Restore:**
    ```bash
    pg_restore -h <host> -U <user> -d <dbname> <backup_file.dump>
    ```

2.  **Redis Restore:**
    *   Stop the Redis server.
    *   Replace `dump.rdb` (and `appendonly.aof` if using AOF) in the data directory with the backup.
    *   Start the Redis server.

## Automation

These scripts should be scheduled via cron or a CI/CD job (e.g., Kubernetes CronJob) to run daily or hourly depending on RPO (Recovery Point Objective).
