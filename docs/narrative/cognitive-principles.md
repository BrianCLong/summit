# Cognitive Principles & Doctrine

> *This document defines the immutable cognitive doctrine of Summit. These principles are not suggestions; they are the axioms upon which the platform's user experience and automation logic are built.*

---

## 1. The Principle of Cognitive Economy
**The Operator's attention is the most expensive resource in the system.**
*   Summit shall never consume human attention without offering a proportionate reduction in uncertainty.
*   "FYI" alerts are a failure mode. If no action or decision is possible, the signal should be logged, not alerted.

## 2. The Principle of Bounded Responsibility
**Anxiety is the product of unbounded unknowns.**
*   Summit must always frame the boundaries of a problem.
*   "Something is wrong" is unacceptable. "Service X is failing, likely due to Change Y, affecting Customer Z" is the standard.
*   Users are responsible only for the choices presented to them, not for the infinite universe of potential signals they cannot see.

## 3. The Principle of Decision Hygiene
**Speed without structure is negligence.**
*   No critical action shall be executed without a structured proposal phase.
*   Every decision must have a recorded "Why" (Rationale) and a recorded "What If" (Risk Assessment).
*   The system must enforce cooling-off periods for high-risk, irreversible actions (the "Anti-Panic Veto").

## 4. The Principle of Structural Blamelessness
**The system is responsible for the constraints; the human is responsible for the choice.**
*   If a user executes a destructive command, the system failed to block or warn them.
*   Postmortems must focus on "Why did the system allow this?" rather than "Why did the user do this?"
*   Memory is preserved to improve the graph, not to shame the operator.

## 5. The Principle of Explicit Bias Countermeasures
**We do not trust human intuition under pressure.**
*   The system actively counters known cognitive biases (Action Bias, Authority Bias, Recency Bias).
*   Policy always outranks authority. The graph does not care about job titles.
*   Historical context is mandatory for every new incident to prevent Recency Bias.

---

## Implementation Checklist

- [ ] Does this feature reduce the number of raw signals a user sees?
- [ ] Does this alert include a "Why" and a "What Next"?
- [ ] Is there a policy guardrail preventing catastrophic error?
- [ ] Is the decision logic recorded in the Provenance Ledger?
- [ ] Would a tired, stressed operator understand this screen in 5 seconds?

---

*This doctrine is locked. Amendments require approval from the Architecture Council.*
