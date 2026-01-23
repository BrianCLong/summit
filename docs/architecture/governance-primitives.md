# Summit Governance Primitives

**Version:** 1.0
**Status:** Active
**Owner:** Platform Architecture

This document defines the core governance primitives that provide the foundation for Summit's defensible intelligence platform.

## 1. Evidence-Linked Policy Verdicts (GOV-PRM-001)

### Description
Every decision made by the governance engine (OPA) must be explicitly linked to one or more Evidence IDs. This ensures that "allowed" or "denied" verdicts are not just heuristic but are grounded in verifiable artifacts.

### Inputs
*   **Subject**: Actor ID (Agent or User).
*   **Action**: Operation requested.
*   **Resource**: Target entity or data.
*   **Evidence IDs**: List of IDs from the `COMPLIANCE_EVIDENCE_INDEX.md` or `Provenance Ledger`.

### Deterministic Outputs
*   **Verdict ID**: Stable hash of (Subject, Action, Resource, Policy Hash).
*   **Linked Evidence Hash**: Lexicographical hash of all input Evidence IDs.
*   **Verdict**: `ALLOW` | `DENY` | `REVIEW_REQUIRED`.

### CI Enforcement Point
*   `scripts/ci/verify_governance_verdicts.py`: Ensures every verdict in a release bundle is linked to valid evidence.

---

## 2. Deterministic State Snapshots (GOV-PRM-002)

### Description
To enable "Audit Replay," Summit captures deterministic snapshots of agent execution state. These snapshots exclude non-deterministic data (timestamps, ephemeral PIDs, random seeds) to allow auditors to re-run the exact same logic and verify the outcome.

### Inputs
*   **Execution DAG**: The graph of tasks.
*   **Input Evidence**: Hashes of all input data.
*   **Model Parameters**: Version and configuration of the LLM/Model.

### Deterministic Outputs
*   **State Hash**: Stable hash of the execution context.
*   **Checkpoint ID**: Replay-compatible identifier.

---

## 3. Cross-Tenant Governance Synchronization (GOV-PRM-003)

### Description
Allows for the safe synchronization of governance policies across tenants (e.g., from a Global Headquarters to Regional Offices) without leaking sensitive tenant data. It uses a "Policy Hub" pattern where shared policies are cryptographically signed and verified before adoption.

### Inputs
*   **Policy Bundle**: OPA `.rego` files + `data.json`.
*   **Origin Signature**: Cryptographic proof of origin.
*   **Tenant Filter**: Rules for applying shared policies locally.

### Deterministic Outputs
*   **Sync Receipt**: Evidence of policy adoption.
*   **Local Policy Hash**: The final hash of the policy as applied in the local tenant.

---

## Summary Table

| Primitive | Deterministic Factor | Evidence ID Compatible | CI Enforcement |
| :--- | :--- | :--- | :--- |
| **GOV-PRM-001** | Verdict Hash | Mandatory | Yes |
| **GOV-PRM-002** | State Hash | Yes | Yes |
| **GOV-PRM-003** | Policy Hash | Yes | Yes |
