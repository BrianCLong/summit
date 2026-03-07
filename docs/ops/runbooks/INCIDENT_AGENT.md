# Runbook: Agent & Worker Incidents

## 1. Symptoms

- **Alert:** `QueueBacklog` (SEV-2) or `DeadLetterQueue` (SEV-3)
- **User Report:** "My report is stuck in 'Processing'" or "AI agent didn't reply".
- **Grafana:** Queue depth growing, worker throughput dropping.

## 2. Immediate Containment

1.  **Check for Stuck Jobs:**
    Are jobs failing or just slow?
2.  **Pause Non-Critical Queues:**
    To prioritize critical path (e.g., login emails vs. daily reports):
    ```bash
    ./scripts/incident/containment.sh --action pause_queue --queue "analytics-report"
    ```
3.  **Restart Workers:**
    If workers are hung (zombies):
    ```bash
    kubectl rollout restart deployment/worker -n production
    ```

## 3. Diagnostics

- **Inspect Queue Status:**
  ```bash
  # Check queue counts via CLI
  ./scripts/ops/check-queues.ts
  ```
- **Check Worker Logs:**
  Look for OOM (Out of Memory) kills or timeouts.
  ```bash
  kubectl get pods -n production | grep worker
  kubectl logs deployment/worker -n production --tail=50
  ```
- **Check Redis Health:**
  Is Redis memory full?
  ```bash
  redis-cli info memory
  ```

## 4. Mitigation

- **Clear Stuck Jobs:**
  If a poison pill job is crashing workers, move it to DLQ:
  ```bash
  ./scripts/ops/drain-queue.ts --queue "main" --moveTo "failed"
  ```
- **Increase Concurrency:**
  If valid load increase, add more workers:
  ```bash
  kubectl scale deployment/worker --replicas=5 -n production
  ```

## 5. Escalation

- Escalate to **Platform Team** if Redis is unstable.
- Escalate to **AI Team** if Agents are looping/hallucinating causing backpressure.

## 6. Post-Incident

1.  Capture evidence: `./scripts/capture-incident-evidence.ts --incident-id <ID>`
2.  Review job timeout settings and retries.
