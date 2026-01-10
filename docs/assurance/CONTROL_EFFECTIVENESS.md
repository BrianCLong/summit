# Control Effectiveness Mapping

This inventory shows which controls govern autonomy, how effectiveness is proven, and where evidence is stored. Every claim links to a control firing record and outcome verification.

## 1. Control Inventory

| Control                     | Purpose                                              | Trigger                                                     | Default Action                                        | Evidence Location                                         |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Policy Gates                | Enforce hard/soft rules before execution.            | Policy engine evaluation (OPA + local rules).               | Allow, deny, or require human co-sign.                | Policy decision logs, receipt with policy hash.           |
| Budget Caps                 | Prevent unapproved spend.                            | Cost estimate exceeds cap or real-time burn > threshold.    | Demote autonomy tier or halt action.                  | Cost guard evaluations, budget ledgers.                   |
| Coordination Arbitration    | Resolve conflicting actions across domains.          | Concurrent intents detected.                                | Select safest intent and suppress others.             | Orchestrator arbitration log, suppressed action receipts. |
| Kill Switch                 | Immediate pause of autonomous actions in a scope.    | Manual trigger or automated safety violation.               | Pause autonomy, block new actions, initiate rollback. | Kill-switch ledger, rollback verification.                |
| Rollback Mechanisms         | Return system to last known-safe state.              | Failed action, kill-switch, or drift detection.             | Execute rollback playbook; validate success.          | Rollback runbook logs, post-rollback health checks.       |
| Progressive Delivery Guards | Limit blast radius for changes.                      | New configuration rollout or model swap.                    | Canary + automated reverts on SLO regressions.        | Deployment controller logs, SLO burn charts.              |
| Delegation & Approvals      | Ensure human accountability for higher-risk actions. | Actions in reputational/regulatory scope or over threshold. | Require explicit approval with expiry.                | Delegation records, signed approval tokens.               |

## 2. Effectiveness Evidence (What to prove)

- **Detection:** Control triggered with reason code and timestamp.
- **Intervention:** Action taken (deny, demote, pause, rollback) with scope and duration.
- **Outcome:** Verification that risk was contained (post-check SLOs, budget spend avoided, policy compliance maintained).
- **Traceability:** Hash of policy/config used, initiator identity, and linkage to affected receipts.

### 2.1 Assurance Question Mapping

| Assurance Question                              | Control Evidence Needed                                           |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| What autonomous actions occurred?               | Action receipts with control attachments and policy decisions.    |
| At what autonomy tier, and why?                 | Tier selection logs + policy rationale + approvals (if required). |
| What risks were accepted or mitigated?          | Risk scores, acceptance records, and control intervention logs.   |
| What value was delivered vs. exposure incurred? | Value realization evidence with mitigation cost breakdown.        |
| What would have happened without autonomy?      | Simulation run IDs + counterfactual control firing projections.   |
| Can we stop or downgrade autonomy instantly?    | Kill-switch activation logs + verification timestamps.            |

## 3. Reporting Format (per control)

For each control, report the last period (monthly/quarterly):

- Count of firings and top three reasons.
- Prevented impact (cost avoided, incidents avoided, SLA minutes protected).
- Time-to-respond and time-to-verify.
- Any misses or overrides with root cause and mitigation.

## 4. Evidence Collection Playbook

1. **Log normalization:** Stream control events into the provenance ledger with canonical fields: `control`, `scope`, `trigger_reason`, `action_taken`, `initiator`, `ts_start`, `ts_end`, `verification_id`.
2. **Verification tasks:** Auto-run post-checks (SLO burn, budget delta, policy state) and attach results to `verification_id`.
3. **Drills:** Monthly kill-switch and rollback drills with recorded outcomes; include in quarterly regulator packet.
4. **Counterfactuals:** For blocked items, run simulation to show expected outcome if allowed; attach run ID to the prevented action record.

## 4.1 Control Evidence Schema (minimum fields)

- `control_id`, `control_name`
- `trigger_reason`, `severity`
- `action_taken`, `scope`, `ts_start`, `ts_end`
- `initiator_id`, `initiator_role`
- `verification_id`, `verification_hash`
- `affected_receipts[]`, `policy_hash`

## 5. Effectiveness Scoring

- **Coverage (30%):** Controls attached to 100% of autonomous playbooks in scope.
- **Reliability (30%):** % of firings that executed without error and within SLA (e.g., pause < 60s).
- **Accuracy (20%):** Low false-positive rate; validated via counterfactual comparisons.
- **Auditability (20%):** Evidence linked to receipts with immutable hashes and reviewer sign-off where required.

## 6. Review Cadence

- **Monthly:** Control firing summary, misses, and drill results.
- **Quarterly:** Full effectiveness score, remediation plan, and attestation in the external assurance packet.
