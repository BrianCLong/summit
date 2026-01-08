# Runbook: Agent Runaway / Budget Exhaustion

**Severity:** SEV1 (SEV0 if global impact)
**Owner:** AI/ML Ops / SRE
**Triggers:**

- Alert: `AgentLoopIterations > 50`
- Alert: `BudgetUsage > Threshold` (Rapid depletion)
- User Report: "Agent is stuck in a loop" or "Costs skyrocketing"

## Detection Signals

- **Metric:** `intelgraph_agent_loop_iterations` histogram showing counts in high buckets.
- **Metric:** `intelgraph_budget_usage_total` rate increase > 50% over 5m.
- **Log Pattern:** Repeated tool calls with identical arguments in `server/logs/maestro.log`.

## Immediate Actions (Containment)

1.  **Identify the Agent/Tenant:**
    - Check alert labels for `agent_id` and `tenant_id`.
    - Query Logs: `grep "AgentLoop" server/logs/maestro.log | tail -n 20`

2.  **Activate Kill-Switch (if needed):**
    - **Scope:** Specific Agent.
    - **Command:**
      ```bash
      # Stop specific agent run
      curl -X POST https://api.intelgraph.com/api/maestro/runs/{runId}/cancel \
        -H "Authorization: Bearer $ADMIN_TOKEN"
      ```
    - **Escalation:** If multiple agents are affected (systemic), use Tenant Kill-Switch.
      ```bash
      # Suspend tenant AI capabilities
      summitctl tenant suspend-feature {tenantId} --feature ai_agents
      ```

3.  **Verify Containment:**
    - Check `intelgraph_active_connections` or active runs count drops.
    - Confirm budget usage rate flattens.

## Investigation & Remediation

1.  **Analyze Prompt/Context:**
    - Retrieve the prompt used for the runaway agent.
    - Look for recursive instructions or lack of exit criteria.

2.  **Adjust Constraints:**
    - Update `MAX_ITERATIONS` config for the specific agent profile.
    - Apply stricter budget limits for the tenant.

3.  **Resume Service:**
    - Once patched/config updated, unsuspend tenant/retry run.

## Post-Incident Verification

- [ ] Run the agent with the same prompt in a sandbox environment (dry-run).
- [ ] Verify loop terminates within limits.
- [ ] Verify budget alert clears.
