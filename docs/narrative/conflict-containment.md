# Conflict Containment: From Open Warfare to Bounded Negotiation

## The inevitability of Conflict

In a healthy organization, conflict is not a bug—it is a feature.

*   **Security** *should* conflict with **Velocity**.
*   **Reliability** *should* conflict with **Feature Functionality**.
*   **Cost Efficiency** *should* conflict with **Scale**.

These tensions keep the organization balanced. The problem is not the conflict itself, but how it is **processed**.

In most organizations, these structural conflicts devolve into interpersonal drama, endless meetings, and political brinkmanship. They "metastasize" from specific technical disagreements into generalized organizational dysfunction.

---

## The Summit Solution: Bounded Negotiation

Summit acts as a "containment vessel" for organizational conflict. It turns open-ended fights into **bounded, structured negotiations**.

### 1. Conflict as Code
Summit forces vague disagreements into precise definitions.

*   **Vague:** "This release is too risky." (Subjective, emotional).
*   **Precise:** "This release violates `policy/risk/p99-latency-threshold`." (Objective, falsifiable).

When conflict is expressed as code (policies, thresholds, metrics), it becomes a technical problem to be solved, not a political battle to be won.

### 2. The "Conflict Surface"
Summit defines *where* conflict happens.

*   **The Wrong Place:** In a Slack DM at 11 PM. In a "War Room." In a passionate email thread.
*   **The Right Place (Summit):**
    *   **The Proposal:** A structured request to change a Policy.
    *   **The Exception:** A formal request for a temporary variance.
    *   **The Arbitrator:** An automated check against the `RiskBudget`.

By strictly defining the "surface area" where conflict is allowed, Summit prevents it from spilling over into personal relationships.

### 3. Consistent Arbitration
Humans are inconsistent. A manager might be strict on Monday and lenient on Friday. This unpredictability fuels anxiety and politicking.

Summit is **relentlessly consistent**.
*   If the budget is exceeded, the request is denied. Every time.
*   If the security scan fails, the merge is blocked. Every time.

This consistency lowers the emotional temperature. You don't get angry at a compiler for finding a syntax error. You shouldn't get angry at Summit for enforcing a policy.

---

## Artifact: Conflict Surfaces vs. Conflict Cascades

### The Cascade (Without Summit)
1.  **Trigger:** A risky deployment fails.
2.  **Blame:** "Why did DevOps let this through?"
3.  **Escalation:** VP of Engineering yells at VP of Ops.
4.  **Reaction:** Ops imposes draconic new manual checks.
5.  **Resentment:** Developers hate the new checks and hide their work.
6.  **Result:** **Systemic Paralysis.**

### The Containment (With Summit)
1.  **Trigger:** A risky deployment fails.
2.  **Detection:** Summit's `IncidentManager` captures the event.
3.  **Adjustment:** The `ErrorBudget` for the team is automatically deducted.
4.  **Constraint:** The team is temporarily blocked from deploying non-critical fixes until the budget recovers (Automated Policy).
5.  **Resolution:** The team focuses on stability to "earn back" their deploy rights.
6.  **Result:** **Systemic Learning.**

## Conclusion

Summit does not eliminate tension. It harnesses it. By turning "warfare" into "physics"—predictable, transparent, and impersonal—Summit allows teams to push against each other productively, creating a dynamic equilibrium that is safe, fast, and scalable.
