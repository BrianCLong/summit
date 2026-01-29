# Information Integrity Moat Strategy

**Status:** ACTIVE
**Goal:** Build structural defensibility and institutional trust.

## 1. The Core Moat: "Determinism in a Probabilistic World"

While competitors offer "AI to catch AI" (black boxes fighting black boxes), Summit offers **Deterministic Verification**.
*   **The Proposition:** We do not say "This is 80% likely to be false." We say "This graph topology violates the Growth Invariant (INT-PRM-001) with a mathematical certainty of sigma-6."
*   **Why it sticks:** Regulators and Enterprises need *auditable* answers, not just better guesses.

## 2. Pillar 1: Evidence-First Governance
Every detection verdict is backed by an immutable artifact.
*   **Mechanism:** Using `provenance-ledger`, every "Swarm Detected" alert is cryptographically linked to the specific topological snapshot and timestamp that triggered it.
*   **Defensibility:** A competitor can copy our code, but they cannot replicate our **Chain of Evidence**. Once a client builds their legal/compliance workflow on our evidence chains, switching becomes a compliance risk.

## 3. Pillar 2: The "Uncertainty Loop" (Attribution Governance)
As defined in `docs/governance/ATTRIBUTION_GOVERNANCE.md`, we enforce strict confidence bands.
*   **C1 (Possible)** -> **C2 (Probable)** -> **C3 (Confirmed)**.
*   **Moat:** Trust. By *refusing* to attribute without high confidence, we become the "System of Record" for truth. When Summit speaks, markets move because we are rarely wrong.

## 4. Pillar 3: Standards Leverage
We do not invent proprietary formats where standard ones exist. We embrace and extend.
*   **DISARM Framework:** Native integration for TTP mapping.
*   **STIX 2.1:** For threat intelligence exchange.
*   **W3C PROV:** For lineage tracking.
*   **Moat:** Network Effect. By being the best *integrator* of these standards, we become the hub of the ecosystem (like the "DISINFOX" paper implies).

## 5. Economic Moat Metrics

| Metric | Driver | Advantage |
| :--- | :--- | :--- |
| **Switching Cost** | Embedded Evidence Chains | **High.** Moving off Summit means breaking the legal chain of custody for past investigations. |
| **Time-to-Replicate** | Historical Graph Data | **Years.** Identifying "organic topology" requires years of baseline data which new entrants don't have. |
| **Regulatory Fit** | EU AI Act / NIST AI RMF | **Perfect.** Our "Glass Box" deterministic approach maps 1:1 to transparency mandates; competitors' "Black Box" approach does not. |

## 6. Execution

We will open-source the *schemas* (allow others to write to our format) but keep the *inference engine* (the thing that validates the schemas) proprietary. This encourages an ecosystem where everyone sends data to Summit.
