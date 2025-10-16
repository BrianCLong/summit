# Table-Level Restore for PostgreSQL

This runbook outlines the steps to perform a table-level restore for a PostgreSQL database, typically from a full database backup or a PITR restored instance.

## Prerequisites

- Access to a PostgreSQL database backup (e.g., a `pg_dump` file or a PITR restored instance).
- `psql` client installed and configured.
- Appropriate database credentials.

## Steps

1.  **Identify the source of the data:** This could be:
    - A `pg_dump` file of the entire database.
    - A separate RDS instance restored to a point in time (using the PITR runbook).

2.  **Connect to the source database (if applicable):** If restoring from a PITR instance, connect to it using `psql`.

3.  **Dump the specific table(s) from the source:**
    - If you have a `pg_dump` file, you can extract specific tables from it.
    - If connecting to a live (PITR) instance:

    ```bash
    pg_dump -h <SOURCE_DB_HOST> -U <SOURCE_DB_USER> -d <SOURCE_DB_NAME> -t <TABLE_NAME> -Fc > <TABLE_NAME>.dump
    ```

    - Replace `<SOURCE_DB_HOST>`, `<SOURCE_DB_USER>`, `<SOURCE_DB_NAME>`, and `<TABLE_NAME>` with your specific details.
    - The `-Fc` option creates a custom-format archive, which is flexible for selective restores.

4.  **Connect to the target database:** Connect to the database where you want to restore the table(s).

5.  **Restore the specific table(s) to the target:**

    ```bash
    pg_restore -h <TARGET_DB_HOST> -U <TARGET_DB_USER> -d <TARGET_DB_NAME> -t <TABLE_NAME> --clean --if-exists <TABLE_NAME>.dump
    ```

    - Replace `<TARGET_DB_HOST>`, `<TARGET_DB_USER>`, `<TARGET_DB_NAME>`, and `<TABLE_NAME>` with your specific details.
    - `--clean`: Clean (drop) database objects before recreating them.
    - `--if-exists`: Use `DROP ... IF EXISTS` commands to clean objects.

6.  **Verify the restored data:**
    - Query the target database to ensure the table data has been restored correctly.

7.  **Perform application-level validation:**
    - Test the application functionality that relies on the restored table to ensure everything is working as expected.

## Considerations

- **Foreign Keys:** Be mindful of foreign key constraints. You might need to temporarily disable them or restore related tables.
- **Dependencies:** Ensure all dependent objects (sequences, indexes, triggers) are also handled during the restore.
- **Downtime:** Plan for potential application downtime during the restore process.
