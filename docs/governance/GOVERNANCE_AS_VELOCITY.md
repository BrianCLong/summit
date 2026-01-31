# Governance as Velocity

> **Status:** DOCTRINE
> **Owner:** Jules (Release Captain)
> **Last Updated:** 2025-05-15

## The Core Paradox

Traditional governance slows you down. **Summit Governance speeds you up.**

How? By inverting the model:

* **Old Way:** "Stop and prove you are safe."
* **Summit Way:** "Go fast because we *know* you are safe."

## Mechanism 1: Algorithmic Auto-Approval

We do not treat all changes equally. The `PolicyEngine` calculates a **Risk Score** for every action.

### The Logic (`server/src/autonomous/policy-engine.ts`)

```typescript
// Conceptual Logic
const riskScore = calculateRisk(context); // 0-100

if (riskScore < 30) {
  return "AUTO_APPROVE"; // 0ms delay
} else if (riskScore < 70) {
  return "PEER_REVIEW"; // Standard flow
} else {
  return "CAB_APPROVAL"; // High risk
}
```

* **Result:** 80% of changes (typos, docs, low-risk config) fly through immediately.
* **Velocity Gain:** Hours/Days of waiting eliminated per ticket.

## Mechanism 2: Passive Attestation

Developers hate taking screenshots for auditors. The `ProvenanceLedgerV2` does it for them.

### The Logic (`server/src/provenance/ledger.ts`)

Every meaningful action (Commit, PR, Deploy, DB Migration) generates a signed `ProvenanceEntry`.

* **Old Way:** Dev runs task -> Dev takes screenshot -> Dev uploads to JIRA -> Auditor checks JIRA.
* **Summit Way:** Dev runs task -> System records `ProvenanceEntry` (with inputs/outputs/witness) -> Auditor checks Ledger.

* **Result:** "Evidence Collection" becomes invisible.
* **Velocity Gain:** 10-15% of developer time reclaimed.

## Mechanism 3: The "Pre-Approved" Paved Road

By defining `PolicyProfiles` (Baseline, Strict, Custom), we create "Paved Roads".

* If you stay on the Paved Road (e.g., use the standard `deploy` task in `EnhancedAutonomousOrchestrator`), you are pre-compliant.
* If you go off-road (e.g., SSH into a box), you trigger high-friction governance.

This **incentivizes** using the automated, fast tools. Governance becomes the *path of least resistance*.

## Metric: "Governance Acceleration"

We measure success not by "number of blocks" but by "time saved".

* **Metric:** `(Manual_Review_Time * Auto_Approved_Count) + (Evidence_Gathering_Time * Task_Count)`
* **Goal:** Summit should save the organization 1,000+ developer hours per quarter via invisible governance.
