# Runbook: Chaos Drill - Broker Loss

**Goal:** Verify system behavior when the Message Broker (NATS/Redis) is down.

## Pre-Drill Checklist

- [ ] Notify DevOps channel (#ops-alerts).
- [ ] Ensure monitoring dashboards are open.
- [ ] Start background load generation (evidence creation).

## Drill Steps

1.  **Induce Failure**
    Kill the NATS pod to simulate a broker outage.

    ```bash
    kubectl delete pod nats-0
    ```

2.  **Observe Behavior**
    - Monitor API error rates. The API should **not** return 500 errors.
    - It should queue writes locally (WAL) or return `202 Accepted` with a "pending" status.
    - Check logs for "Broker unreachable, switching to local queue" messages.

3.  **Restore Service**
    Allow Kubernetes to restart the pod, or manually restart it if necessary.

    ```bash
    # Wait for pod to come back up
    kubectl wait --for=condition=ready pod/nats-0
    ```

4.  **Verify Recovery**
    - Check that the local queue is drained.
    - Verify that the evidence submitted during the outage now appears in Neo4j.
    - Check for data gaps.

5.  **Report**
    - Log the recovery time (RTO).
    - Note any lost data (should be zero).

## Rollback

If the system does not recover automatically:

1. Restart the `prov-ledger` service.
2. Manually replay the WAL if needed.
