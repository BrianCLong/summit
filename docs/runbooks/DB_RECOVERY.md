# Database Recovery Runbook (Point-In-Time)

## Scenario: Corrupted Data / Bad Migration
**Severity:** Critical
**RTO:** 1 Hour
**RPO:** 5 Minutes

## Procedure

1.  **Stop Applications:**
    ```bash
    kubectl scale deployment --all --replicas=0 -n default
    ```

2.  **Identify Restore Point:**
    Find the timestamp *before* the corruption occurred (e.g., `2023-10-27T14:30:00Z`).

3.  **Perform Restore (AWS Console):**
    *   Go to RDS -> Databases -> `summit-prod-db`.
    *   Actions -> **Restore to point in time**.
    *   Identifier: `summit-prod-db-restored`.
    *   Wait for availability (~20-40 mins).

4.  **Switch Traffic:**
    *   Update the `db-credentials` secret in Kubernetes to point to the *new* DB host.
    *   (Optional) Rename the old DB to `-legacy` and the new one to `-prod` (requires reboot).

5.  **Restart Applications:**
    ```bash
    kubectl scale deployment --all --replicas=2 -n default
    ```

6.  **Verify:**
    Check logs for successful connection and data integrity.
