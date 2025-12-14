# Chaos Drills Runbook

This document outlines the procedures for conducting monthly chaos drills to test the resilience and reliability of the IntelGraph platform. The goal of these drills is to proactively identify weaknesses in the system and ensure our monitoring and alerting systems are effective.

## Schedule

- **Frequency:** Monthly
- **Environment:** Staging
- **Default Timing:** Third Wednesday of each month, 14:00 UTC.

---

## Drill 1: Pod Deletion

This drill simulates a random pod failure, testing the self-healing capabilities of our Kubernetes cluster.

### Procedure

1.  **Select a Target:**
    -   Identify a non-critical service running in the `staging` namespace. Good candidates are `intelgraph-server` or a worker pod.
    -   Get the list of pods for the service:
        ```bash
        kubectl get pods -n staging -l app=intelgraph-server
        ```

2.  **Notify the Team:**
    -   Post a message in the `#engineering` Slack channel announcing the start of the drill.
    -   Example: "INFO: Starting Chaos Drill: Pod Deletion in staging. Monitoring `intelgraph-server` for recovery."

3.  **Execute the Drill:**
    -   Randomly delete one of the pods:
        ```bash
        kubectl delete pod -n staging <pod-name>
        ```

4.  **Observe and Verify:**
    -   **Expected Outcome:** Kubernetes should automatically restart the pod. The service should remain available, though some in-flight requests may fail.
    -   **Monitoring:**
        -   Watch the pod status until the new pod is `Running`:
            ```bash
            kubectl get pods -n staging -w
            ```
        -   Check the `ops-guard-v1` Grafana dashboard. Look for a temporary dip in availability or a spike in errors, followed by a quick recovery.
        -   Ensure no new alerts are firing in Alertmanager after the recovery period.

5.  **Conclude the Drill:**
    -   Post an "all clear" message in the Slack channel once the service has stabilized.
    -   Example: "SUCCESS: Chaos Drill: Pod Deletion complete. `intelgraph-server` recovered successfully."
    -   If the drill fails, create a high-priority incident and begin remediation.

---

## Drill 2: Broker/Cache Unavailability

This drill simulates a failure of a critical backing service like Redis or a message broker (e.g., RabbitMQ, Kafka), testing the system's graceful degradation capabilities.

### Procedure

1.  **Select a Target:**
    -   Choose a backing service to target (e.g., the Redis cache).

2.  **Notify the Team:**
    -   Announce the drill in the `#engineering` channel.
    -   Example: "INFO: Starting Chaos Drill: Redis Unavailability in staging. Monitoring for graceful degradation."

3.  **Execute the Drill:**
    -   Scale down the target service to 0 replicas:
        ```bash
        kubectl scale deployment -n staging redis --replicas=0
        ```

4.  **Observe and Verify:**
    -   **Expected Outcome:**
        -   The application should detect the loss of connection to Redis.
        -   Features relying on the cache should be disabled or fall back to the database, potentially with increased latency.
        -   The system should not crash. The circuit breakers in the `postgres.ts` module should open for the affected service.
    -   **Monitoring:**
        -   Check application logs for connection error messages and circuit breaker state changes.
        -   Observe the Grafana dashboards for increased database latency and cache miss rates.
        -   Verify that critical alerts are firing for the unavailable service.

5.  **Restore the Service:**
    -   After 5-10 minutes, scale the service back up:
        ```bash
        kubectl scale deployment -n staging redis --replicas=1
        ```

6.  **Conclude the Drill:**
    -   Verify that the application reconnects to the restored service and returns to normal operation.
    -   Post a summary of the outcome in the Slack channel.
    -   Document any unexpected behavior or failures for post-mortem analysis.

---

## Post-Drill Actions

-   All findings, successful or not, should be briefly documented in a shared document or wiki.
-   Any identified weaknesses or failures should be converted into actionable tickets and prioritized in the backlog.
