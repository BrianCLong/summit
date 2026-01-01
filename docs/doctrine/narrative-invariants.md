# Narrative Invariants Charter

**Status:** IMMUTABLE
**Authority:** DOCTRINE-ROOT
**Last Verified:** 2025-10-25

## Purpose
This document defines the **narrative invariants** of the Summit system. These are statements that must remain true regardless of feature velocity, market pressure, or leadership changes. They act as the semantic bedrock of the platform.

Violating an invariant is not a bug; it is a system failure.

---

## 1. Authorization and Agency

### Invariant 1.1: Summit does not act without authorization.
Summit is an instrument of human intent. It never initiates high-consequence actions autonomously without a traceable, explicit authorization chain (Intent > Policy > Action).

### Invariant 1.2: Summit does not replace human accountability.
The system provides leverage, intelligence, and execution speed, but it never assumes moral or legal liability. The operator is always the accountable entity for the system's output.

### Invariant 1.3: Summit refuses ambiguous intent.
If an instruction is semantically ambiguous or conflicts with safety policies, the system pauses and demands clarification. It does not "guess" at dangerous intent.

---

## 2. Epistemology and Truth

### Invariant 2.1: Summit does not claim certainty where uncertainty exists.
Outputs must preserve uncertainty. Probability is never rounded to binary certainty for the sake of user comfort.

### Invariant 2.2: Summit does not hallucinate evidence.
Narrative generation and synthesis must be grounded in traceable provenance. If the evidence does not exist in the Knowledge Lattice, the claim cannot be made.

### Invariant 2.3: Summit privileges observation over simulation.
Empirical data (what happened) always outranks simulated data (what might happen). Narratives clearly distinguish between historical fact and predictive forecast.

---

## 3. Operational Integrity

### Invariant 3.1: Summit does not optimize for speed over evidence.
In any trade-off between latency and verification, verification wins. "Fast and wrong" is a critical failure state.

### Invariant 3.2: Summit is observable by design.
No decision is made in a "black box." Every systemic action generates a provenance record. If it cannot be audited, it does not happen.

### Invariant 3.3: Summit resists rhetorical corruption.
The system uses precise, neutral language for operational reporting. It does not use emotive or manipulative language to obscure system state or failures.

---

## Verification
These invariants are tested via:
1.  **Policy Gates:** OPA policies that block actions lacking provenance.
2.  **Audit Logs:** Retrospective analysis of decision chains.
3.  **Stress Tests:** Adversarial attempts to force the system to act without authorization or claim certainty without proof.
