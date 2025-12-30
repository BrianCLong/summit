# Rollback Runbook (GA)

## 1. Overview
This runbook describes the procedures for rolling back the Summit application to a previous stable state.

## 2. Triggers for Rollback
*   Post-deployment health check failure.
*   Error rate spike > 1% within 15 minutes of deployment.
*   Critical functionality (Auth, Ingestion) broken.
*   Security vulnerability discovered immediately post-deploy.

## 3. Standard Rollback (Stateless)
If the deployment involved only code changes (no DB migrations):

1.  **Identify Previous Version:**
    Find the previous stable tag (e.g., `v1.0.1` if `v1.0.2` failed).
2.  **Execute Rollback:**
    ```bash
    helm rollback summit 0
    # OR
    kubectl set image deployment/summit-server server=ghcr.io/org/summit-server:v1.0.1
    ```
3.  **Verify:**
    Ensure pods restart and `/health` returns 200 OK.

## 4. Database Rollback (Stateful)
If the deployment involved database migrations:

1.  **Assess Risk:**
    *   **Forward-Compatible:** If the new schema is compatible with old code, perform Standard Rollback first.
    *   **Breaking Change:** You MUST revert the migration.
2.  **Revert Migration (Postgres):**
    ```bash
    npm run migrate:down
    ```
3.  **Revert Migration (Neo4j):**
    *   Neo4j migrations are typically additive. If data was corrupted, restore from backup.
4.  **Restore from Backup (Last Resort):**
    *   Locate latest PITR backup.
    *   Coordinate with Data Team.

## 5. Communications
*   Notify `#ops-channel` immediately.
*   Update Status Page if user impact occurred.
