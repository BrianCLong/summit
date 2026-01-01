# Compliance as a View, Not a Mode

> **Thesis:** Summit is not "SOC 2 compliant" or "ISO 27001 compliant." It is **control-compliant**, and projects these standards as views onto its core reality.

Many systems are built *for* a specific framework (e.g., "We built this for GDPR"). This creates rigidity. When a new regulation arrives (e.g., EU AI Act), the system must be patched or rebuilt.

Summit takes a different approach. We implement **fundamental security and governance primitives**. Compliance frameworks are simply different **lenses** through which we view these primitives.

## The Concept: Primitives vs. Projections

*   **The Reality (Primitives):**
    *   We log every read access.
    *   We enforce MFA on every session.
    *   We hash every data mutation.
    *   We isolate tenants by ID.

*   **The View (Projections):**
    *   **SOC 2 View:** Maps "Log every read access" to *CC6.1 (Security System Monitoring)*.
    *   **GDPR View:** Maps "Isolate tenants by ID" to *Article 5 (Purpose Limitation)*.
    *   **HIPAA View:** Maps "Hash every mutation" to *integrity controls*.

When a new regulation emerges, we do not change the code. We simply update the **Compliance Matrix** to map existing primitives to the new requirements.

## Crosswalk Visuals

### Internal Control → Framework Mapping

| Summit Primitive | SOC 2 (Security) | ISO 27001 | NIST CSF | EU AI Act |
| :--- | :--- | :--- | :--- | :--- |
| **Identity-Aware Proxy** | CC6.1 (Access) | A.9.1.1 | PR.AC-1 | Article 14 (Oversight) |
| **Provenance Ledger** | CC2.2 (Internal Audit) | A.12.4.1 | PR.PT-1 | Article 12 (Logging) |
| **Policy-as-Code (OPA)** | CC5.3 (Process Ops) | A.14.2.5 | PR.IP-1 | Article 15 (Accuracy) |
| **Drift Detection** | CC7.1 (Detection) | A.12.6.1 | DE.CM-1 | Post-Market Monitoring |

## Drift Detection Scenario

Compliance is usually a point-in-time snapshot. In Summit, it is a continuous state. If a control weakens, the "Compliance View" immediately turns red.

**The Scenario:**
1.  **Baseline:** The `production` environment requires 2-person review for all merges.
2.  **The Event:** An engineer disables the branch protection rule on `main` to fix a hotfix quickly (Scenario: "Emergency Bypass").
3.  **The Signal:**
    *   Summit's **Drift Detector** runs (every 5 mins).
    *   It queries the GitHub API and compares it against the `policy/release-gates/gate.rego`.
    *   **Mismatch Detected.**
4.  **The Impact:**
    *   **SOC 2 View:** Flagged as *Non-Compliant* (CC5.3).
    *   **Alert:** Sent to Security Operations Channel.
    *   **Evidence:** The specific hour of non-compliance is recorded in the Ledger.

**Outcome:** The system is **self-healing** in terms of reporting. We don't wait for the annual audit to find out we were vulnerable for 6 months. We know in 5 minutes.

## Future-Proofing
Because we focus on the physics of data (who touched it, where did it go, how was it changed), we are robust against regulatory churn.
*   **New AI Regulation?** We already have model provenance.
*   **New Privacy Law?** We already have field-level access logs.

Summit is the substrate. Compliance is just a query.
