# Point-in-Time Recovery (PITR) for RDS PostgreSQL

This runbook outlines the steps to perform a Point-in-Time Recovery (PITR) for the AWS RDS PostgreSQL instance.

## Prerequisites

- AWS CLI configured with appropriate permissions.
- Knowledge of the RDS instance identifier and desired restore time.

## Steps

1.  **Identify the restore time:** Determine the exact timestamp (UTC) to which you want to restore the database.

2.  **Restore the DB instance:**

    ```bash
    aws rds restore-db-instance-to-point-in-time \
        --source-db-instance-identifier <SOURCE_DB_IDENTIFIER> \
        --target-db-instance-identifier <NEW_DB_IDENTIFIER> \
        --restore-to-time "YYYY-MM-DDTHH:MM:SSZ" \
        --db-instance-class <DB_INSTANCE_CLASS> \
        --vpc-security-group-ids <SG_ID_1> <SG_ID_2> \
        --db-subnet-group-name <DB_SUBNET_GROUP_NAME> \
        --no-multi-az # Restore as single-AZ initially, then modify if needed
    ```

    - `<SOURCE_DB_IDENTIFIER>`: The identifier of the original DB instance.
    - `<NEW_DB_IDENTIFIER>`: A new identifier for the restored DB instance.
    - `YYYY-MM-DDTHH:MM:SSZ`: The desired restore time in UTC (e.g., `2023-10-27T10:00:00Z`).
    - `<DB_INSTANCE_CLASS>`: The instance class for the restored DB (e.g., `db.t3.medium`).
    - `<SG_ID_1> <SG_ID_2>`: Security group IDs for the restored instance.
    - `<DB_SUBNET_GROUP_NAME>`: The DB subnet group name.

3.  **Verify the restored instance:**
    - Connect to the new DB instance and verify that the data is as expected.

4.  **Update application configuration:**
    - Once verified, update your application's database connection string to point to the new DB instance endpoint.

5.  **Consider promoting to primary (if applicable):** If this restored instance is to become the new primary, you may need to perform additional steps to update DNS records or application configurations.

## Post-Recovery Actions

- Monitor the new DB instance for performance and stability.
- Consider taking a new snapshot after successful recovery.
