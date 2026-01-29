# Runbook: Claude Code Swarm Orchestration

## Symptoms
*   **Stuck Tasks:** Tasks remain `pending` despite dependencies being met.
*   **Policy Denials:** Valid actions are blocked.
*   **Drift:** Replay verification fails.

## Diagnosis
1.  **Check Event Log:**
    ```bash
    tail -f ~/.summit/orchestrator/events.jsonl
    ```
2.  **Verify Graph State:**
    Run the drift detection script:
    ```bash
    npx tsx scripts/monitoring/claude-code-swarm-orchestration-drift.ts
    ```

## Mitigation
### Stuck Tasks
*   Check `blockedBy` references in the Task definition.
*   Ensure the blocking task emitted a `TASK_COMPLETED` event.
*   Manually emit a completion event if needed (with caution).

### Policy Denials
*   Check `policies/orchestrator.rego`.
*   Verify the agent's identity and role in the Team configuration.

### Drift
*   If `drift_report.json` indicates mismatch, archive the current log and state, and restart the swarm from a known good snapshot (if available) or fresh state.
