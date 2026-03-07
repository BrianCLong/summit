# High Error Rate Runbook

## Trigger

This alert is triggered when the ratio of 5xx errors to total requests exceeds 1% for 5 minutes.

## Severity

**Critical** (P1)

## Impact

Users are experiencing failures and may be unable to use the application.

## Diagnosis

1.  **Check Logs:** Look for error logs in the `server` logs.
    ```bash
    kubectl logs -l app=server -n summit
    ```
2.  **Check Database:** Verify that PostgreSQL and Neo4j are reachable and healthy.
3.  **Check Dependencies:** Are external services (e.g., Auth0, OpenAI) down?

## Mitigation

1.  **Rollback:** If a deployment recently occurred, rollback immediately.
    ```bash
    # Follow Rollback Playbook
    ```
2.  **Scale Up:** If CPU/Memory is high, scale up the pods.
    ```bash
    kubectl scale deployment server --replicas=5
    ```

## Escalation

If unable to resolve within 15 minutes, escalate to the Platform Engineering Lead.
