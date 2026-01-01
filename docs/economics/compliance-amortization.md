# Compliance Amortization
> **Thesis:** Summit transforms compliance from a recurring variable cost into a reusable fixed asset.

## The Status Quo: The Compliance Tax
For most organizations, compliance (SOC2, ISO 27001, FedRAMP) is a recurring nightmare:
*   **Variable Cost:** Every audit requires fresh evidence collection ("screenshots").
*   **Single-Use:** Evidence gathered for SOC2 is rarely formatted correctly for HIPAA.
*   **Human-Heavy:** Engineers spend weeks per quarter playing "fetch" for auditors.

## The Summit Shift: Compliance as Code & Memory
Summit treats compliance evidence not as a snapshot, but as a continuous stream of signed, verifiable facts stored in the Provenance Ledger.

### 1. Implement Once, Map Many
*   **Concept:** A control (e.g., "Code Review Required") is enforced by a Policy.
*   **Mechanism:** The policy execution generates a signed evidence record.
*   **Amortization:** This single record satisfies:
    *   SOC2 CC2.1
    *   ISO 27001 A.14.2
    *   FedRAMP CM-3
*   **Economic Effect:** Marginal cost of adding a new framework drops by ~70%.

### 2. Evidence Reusability (N-Times)
*   **Concept:** Evidence is stored in a canonical, framework-agnostic format.
*   **Mechanism:** Mappers project this canonical evidence into specific auditor views.
*   **Amortization:** The cost of collection is incurred once. The value is realized N times (internal audit, external audit, customer due diligence, regulator inquiry).

### 3. Continuous vs. Periodic Cost
*   **Concept:** Flattening the "Audit Spike."
*   **Mechanism:** Continuous compliance monitoring means the "audit prep" phase is eliminated. You are always audit-ready.
*   **Economic Effect:** Replaces expensive "crunch time" consulting fees with predictable, low-overhead software subscription.

## The Calculator: Compliance Amortization

We model the savings based on:

1.  **Controls Implemented:** $N$
2.  **Frameworks Targeted:** $F$
3.  **Collection Frequency:** $T$

**Traditional Cost:** $\sum (N \times T)$ per Framework
**Summit Cost:** $(N \times T) + (Mapping Cost \times F)$

Since $Mapping Cost \ll Collection Cost$, the savings compound with every new framework added.

### Metric: The "Audit Multiplex Ratio"
*   **Definition:** Average number of compliance requirements satisfied by a single unit of evidence.
*   **Goal:** > 3.0 (e.g., one artifact satisfies SOC2, ISO, and FedRAMP).

## Strategic Value
For large enterprise buyers, this is a massive operational unblocker. It turns "We can't sell to healthcare because we aren't HIPAA ready" from a 6-month project into a configuration task.
