# Decision Hygiene vs. Heroics

## The Cognitive Contamination of Crisis

Most operational failures are not failures of intelligence; they are failures of context.

In high-stakes environments—cybersecurity incident response, financial fraud mitigation, critical infrastructure control—operators are often forced to make irreversible decisions under conditions of "cognitive contamination":

1.  **Time Compression:** The false belief that *any* action is better than *delayed* action.
2.  **Context Fragmentation:** Viewing alerts in isolation rather than as part of a narrative.
3.  **Authority Bias:** Deferring to the highest-paid person in the room rather than the most accurate data.
4.  **Action Bias:** The psychological impulse to "do something" to relieve anxiety.

## Summit as a Hygiene System

Summit treats decision-making not as an art, but as a sanitary process. Just as a surgeon scrubs before operating, Summit forces a "scrubbing" of the decision context before an action can be executed.

### 1. Structured Proposals
In Summit, you do not simply "ban a user" or "rollback a deployment." You propose a **Decision Object**.
This object must contain:
*   The **Signal**: What triggered this?
*   The **Scope**: Who/what will this affect?
*   The **Rationale**: Why is this the correct path?

### 2. Explicit Risk Framing
Every decision path in Summit is decorated with computed risk scores.
*   *Path A (Block IP):* Low Risk, High Reversibility.
*   *Path B (Purge Tenant):* High Risk, Low Reversibility.

This forces the operator to acknowledge the "blast radius" of their choice *before* clicking.

### 3. Calm, Auditable Approvals
For actions above a certain risk threshold, Summit enforces a "Two-Person Rule" policy. This is not just for security; it is for **cognitive distribution**. It forces the proposer to articulate their reasoning to a validator, breaking the "tunnel vision" loop.

## The Shift: From Heroics to Process

| Traditional Operations | Summit Operations |
| :--- | :--- |
| **Ad-hoc Escalation:** "Call Dave, he knows what to do." | ** structured Proposals:** "Submit a remediation proposal for Approval Group Alpha." |
| **Chat-based Firefighting:** Decisions buried in Slack threads. | **System of Record:** Decisions are first-class citizens in the graph. |
| **Pager Fatigue:** Constant, low-context alerts. | **Contextual Bundles:** Alerts are aggregated into "Incidents" requiring one high-quality decision. |
| **Heroics:** "We saved the day at 3 AM." | **Hygiene:** "We followed the process and the system remained stable." |

## Conclusion

Summit does not replace human judgment. It protects it. By enforcing decision hygiene, we ensure that when a human *does* intervene, they are operating at the top of their license—focused on strategy, ethics, and nuance, not panic.
