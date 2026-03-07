# Trust-to-Roadmap Decision Playbook

This playbook defines the rules for ingesting signals, interpreting them, and making roadmap decisions.

## 1. Signal Ingestion Rules

Not all feedback is a "Trust Signal." To enter the loop, a signal must meet one of these criteria:

- **Metric Violation**: Any breach of public SLOs or committed internal SLAs.
- **Trust Erosion**: Feedback explicitly mentioning "integrity," "security," "reliability," or "transparency."
- **Documentation Drift**: >3 customers asking the same question about how data is handled.
- **Governance Failure**: Any manual override of a safety system.

**Signals to BUFFER (Do not react immediately):**

- Feature requests disguised as bugs.
- Single-user preferences without security/trust implications.
- Vague "sentiment" without specific attributability.

## 2. Interpretation & Prioritization Logic

### Severity Tiers

| Tier                   | Definition                                                              | Roadmap Impact                                            |
| :--------------------- | :---------------------------------------------------------------------- | :-------------------------------------------------------- |
| **Systemic (P0)**      | Fundamental breach of promise (Data Integrity, Security, Availability). | **Immediate Injection.** Current sprint scope is reduced. |
| **Friction (P1)**      | Users struggle to verify system correctness.                            | **Next Sprint.** Prioritized above P2 features.           |
| **Clarification (P2)** | Users are confused but safe.                                            | **Backlog.** Scheduled in standard planning cycles.       |

### Prioritization Factors

- **Multi-Tenant Impact**: Does this affect multiple customers? (Multiplier: 3x)
- **Public Visibility**: Is this visible on the status page or public audit reports? (Multiplier: 2x)
- **Governance Correlation**: Did a governance check fail or was one missing? (Multiplier: 5x)

## 3. Decision Authorities & Guardrails

### Roles

- **Proposer**: Any Engineer, PM, or Support Lead.
- **Decider**: Product Owner + Engineering Lead (Consensus required).
- **Veto**: Governance Owner (if the proposed change weakens security/compliance).

### The Golden Rule

> **Trust signals may reprioritize work, but they may NEVER bypass governance, graduation, or capacity limits.**

### Zero-Sum Capacity Enforcer

If a P0 Trust Signal forces a roadmap addition:

1.  Identify the lowest-value item in the current sprint/quarter.
2.  Explicitly **Defer** or **Cut** that item.
3.  Log the swap in the Roadmap Change Log.
4.  **No Overtime/Crunch** to absorb the delta. Trust is not built on burnt-out teams.
