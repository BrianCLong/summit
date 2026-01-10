# MVP-4 Rollback Playbook

**Severity:** Critical
**Authorization:** On-Call Engineering Manager

## Scenarios

### Scenario A: Application Failure (Code Bug)
*Trigger:* Error rate spikes > 1% or functional regression found.

**Action:**
1.  **Revert Helm Release:**
    ```bash
    helm rollback intelgraph <PREVIOUS_REVISION> -n production
    ```
2.  **Verify Rollback:**
    ```bash
    kubectl rollout status deployment/server -n production
    ```
3.  **Notify:** Update status page and Slack `#incident-room`.

### Scenario B: Database Migration Failure (Data Corruption)
*Trigger:* Data integrity check fails or schema mismatch errors.

**Action:**
1.  **Stop Traffic:**
    ```bash
    kubectl scale deployment/server --replicas=0 -n production
    ```
2.  **Restore Database (Postgres):**
    *   Identify last good PITR snapshot.
    *   Restore to new instance.
    *   Switch connection string in Sealed Secret.
3.  **Restore Database (Neo4j):**
    *   Run `scripts/restore-neo4j.sh <BACKUP_ID>`.
4.  **Restart Traffic:**
    ```bash
    kubectl scale deployment/server --replicas=<ORIGINAL> -n production
    ```

### Scenario C: Feature Flag Performance Issue
*Trigger:* Specific feature causing latency spike.

**Action:**
1.  **Kill Switch:**
    ```bash
    # If using Flagsmith or similar config
    curl -X POST https://flags.intelgraph.io/api/v1/flags/<FLAG_KEY>/toggle \
      -H "Authorization: Bearer $FLAG_TOKEN" \
      -d '{"enabled": false}'
    ```
    *Alternatively, update ConfigMap:*
    ```bash
    kubectl edit configmap feature-flags -n production
    # Set <FLAG_KEY>: "false"
    kubectl rollout restart deployment/server -n production
    ```

## Post-Rollback
1.  **Capture State:** Save logs, metrics snapshots.
2.  **Root Cause Analysis:** Start incident review process.
