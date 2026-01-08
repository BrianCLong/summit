# Runbook: Cost & Budget Incidents

## 1. Symptoms

- **Alert:** `BudgetSpike` (SEV-2)
- **Notification:** AWS/OpenAI billing alert email.
- **Grafana:** "Cost Burn Rate" dashboard shows vertical line.

## 2. Immediate Containment

1.  **Identify the Spender:**
    Which service? (LLM tokens, EC2 instances, Data egress?)
2.  **Emergency Throttle (LLM):**
    If LLM spend is runaway:
    ```bash
    # Switch to cheaper model or lower rate limits
    ./scripts/incident/containment.sh --action degrade_model --model "gpt-3.5-turbo"
    ```
3.  **Stop Rogue Jobs:**
    If a batch job is spinning:
    ```bash
    ./scripts/incident/containment.sh --action kill_job --job-id <id>
    ```

## 3. Diagnostics

- **Check Token Usage:**
  ```bash
  # Query token usage by tenant/user
  ./scripts/ops/check-token-usage.ts --last-hours 1
  ```
- **Check Infrastructure Scaling:**
  Did auto-scaling go crazy?
  ```bash
  kubectl get nodes
  ```

## 4. Mitigation

- **Cap Resources:**
  Apply hard limits to the affected tenant or service.
- **Revoke Keys:**
  If an API key is leaked and being abused, revoke immediately.

## 5. Escalation

- Escalate to **FinOps/Finance** if overage > $500.
- Escalate to **CTO** immediately if projected overage > $2000.

## 6. Post-Incident

1.  Capture evidence.
2.  Adjust quota limits and auto-scaling policies.
3.  File for refund/credit if applicable (cloud provider error).
