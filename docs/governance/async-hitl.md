# Async Human-in-the-Loop (HITL) Strategy

**Status:** Draft
**Owner:** Jules
**Context:** Automation Turn #5

## 1. The Problem with Blocking Approvals
The legacy `approvals` table model blocks agent execution until a human physically clicks "Approve". This destroys velocity and forces humans to be synchronous parts of the loop.

## 2. Confidence-Based Escalation
Instead of blocking by default, we use **Escalation Triggers**:

1.  **Low Risk (Autonomy):** Agent confidence > 0.9 AND Cost < $0.10.
    *   *Action:* Execute immediately. Log for post-hoc audit.
2.  **Medium Risk (Notification):** Agent confidence > 0.7 OR Cost < $1.00.
    *   *Action:* Execute immediately, but send async notification ("I did X").
    *   *Control:* Operator can `PAUSE` or `ROLLBACK` within N minutes.
3.  **High Risk (Escalation):** Agent confidence < 0.7 OR Cost > $1.00 OR Sensitive Tool (e.g., `deploy:prod`).
    *   *Action:* `PAUSE` execution. Create `EscalationTicket`.
    *   *Control:* Requires explicit `RESUME` signal.

## 3. Implementation Logic
The `EnhancedAutonomousOrchestrator` will be updated to emit `EscalationEvents` instead of polling for boolean approvals.

```typescript
if (action.risk > threshold) {
  await this.pauseRun(runId);
  await this.emit('escalation_required', { reason: 'Confidence low' });
}
```

## 4. Post-Hoc Correction
For non-blocking actions, we rely on **Trajectory Reversal**:
- If an audit finds a bad action, we trigger a `ROLLBACK` utilizing the Provenance Ledger to undo side effects (where possible) or emit compensating transactions.
