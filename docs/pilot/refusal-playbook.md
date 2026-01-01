# Refusal Playbook

## Philosophy
"No action" is a valid, safe, and often preferred outcome. Summit builds trust by refusing to validate unsafe or unsupported decisions.

## Authority Boundaries
* **Summit Authority:** Can block automated actions. Can advise human operators.
* **Human Override:** A human operator can *always* override Summit with a written justification (during Phase 3).
* **Hard Block:** Summit strictly blocks actions that violate core compliance rules (e.g., "No deployment on Fridays without VP approval") unless a "Break Glass" procedure is invoked.

## Explicit Refusal Conditions

Summit will return **REFUSED** or **INSUFFICIENT_EVIDENCE** if:

1. **Evidence Void:** The request lacks required evidence artifacts (e.g., "Block IP" request with no attached logs).
2. **Policy Violation:** The action directly contradicts an active governance policy (e.g., "Revoke Admin" on a Service Account without a ticket).
3. **Context Mismatch:** The severity claimed does not match the evidence provided (e.g., "Critical" incident with no high-severity alerts).
4. **Drift Detected:** The target system state is different from what the operator assumes (e.g., "Restart Server" but server is already down).

## Refusal Workflows

### Scenario 1: Insufficient Evidence
* **Summit Response:** "Decision deferred. Please attach logs from [Source] to proceed."
* **Operator Action:** Gather missing evidence -> Resubmit.

### Scenario 2: Policy Violation (Soft)
* **Summit Response:** "Action violates Policy [ID]. Risk: High. Proceed?"
* **Operator Action:**
    * **Abort:** "Good catch, cancelling."
    * **Override:** "Proceeding due to urgency. Justification: [Text]." -> Logged as **Override**.

### Scenario 3: Hard Block (Safety)
* **Summit Response:** "Action BLOCKED. Target is a Crown Jewel Asset. Two-person rule required."
* **Operator Action:** Second operator must authenticate to unlock the action.

## Measuring Refusal Success
A refusal is successful if:
1. It prevented a bad action.
2. It prompted the operator to improve evidence quality.
3. The operator *agreed* with the refusal (post-hoc).
