# Rollback Procedure

**Time Requirement:** < 15 minutes
**Goal:** Restore service to previous stable version (v0.9.9).

## Triggers

- Error rate > 1% for > 5 minutes.
- Data corruption detected.
- Security breach identified.

## Steps

1.  **Stop Ingestion (Prevent Data Loss)**

    ```bash
    kubectl scale deploy ingestion-worker --replicas=0
    ```

2.  **Revert Application Version**

    ```bash
    helm rollback intelgraph-server 0
    # OR
    kubectl set image deploy/server server=intelgraph/server:v0.9.9
    ```

3.  **Restore Database (If Data Corruption)**
    - **Postgres:**
      ```bash
      # Restore from pre-migration snapshot
      aws rds restore-db-instance-from-db-snapshot \
          --db-instance-identifier intelgraph-prod \
          --db-snapshot-identifier snap-20251030-final
      ```
    - **Neo4j:**
      - Switch to Read Replica.
      - Promote Replica to Leader.

4.  **Verification**
    - Run `scripts/smoke-test.sh`.
    - Verify data integrity checksums.

5.  **Resume Ingestion**
    ```bash
    kubectl scale deploy ingestion-worker --replicas=3
    ```

## Communication

- Update Status Page: "Investigating Issue" -> "Maintenance".
- Notify #incident-response.
