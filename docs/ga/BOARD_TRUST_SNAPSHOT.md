# Board-Level Trust Snapshot: Interpretation Guide

**Objective:** This document defines the immutable contract for interpreting Summit's machine-derived risk metrics. It serves as the bridge between technical trust signals and board-level risk acceptance.

## 1. Metric Definitions

### Integrity Exposure
*   **Definition:** The degree to which the system's runtime state matches its trusted, provenance-backed definition.
*   **Scale:** 0-100 (0 = Compromised, 100 = Verified).
*   **Liability Model:** Any score < 100 represents a breach of supply chain custody.
    *   **Financial Cap:** Defined in `FAILURE_ECONOMICS.yml` per violation.
    *   **Critical Threshold:** 100. Non-negotiable for Production.

### Availability Exposure
*   **Definition:** The quantitative compliance with uptime SLAs, derived from incident artifacts.
*   **Scale:** 0-100 (percentage of SLA met).
*   **Risk:** Values < 99.9 indicate active degradation requiring incident response.

### Auditability Exposure
*   **Definition:** The completeness of required evidence artifacts (provenance, invoices, attestations) for the current build.
*   **Scale:** 0-100 (ratio of present/required artifacts).
*   **Legal Impact:** Scores < 100 imply inability to defend against liability claims in court.

## 2. Interpretation Boundaries

> [!IMPORTANT]
> **No Narrative Override:** These metrics are machine-derived and cannot be altered by human explanation.

*   **GREEN State:** All metrics = 100. Risk is within standard operating limits.
*   **AMBER State:** Integrity < 100, or Availability < 99.9. Operational risk is elevated; freeze window in effect.
*   **RED State:** Integrity = 0. System is effectively untrusted. Uninsurable state.

## 3. Data Source & Immutability
*   **Source:** All metrics are computed by `scripts/ci/compute_risk_metrics.mjs` running in a trusted CI environment.
*   **Signature:** Each snapshot is cryptographically signed by the CI runner identity.
*   **Retention:** Snapshots are immutable and retained for 365 days (per Audit Policy).

## 4. Auditor Replay
To verify a snapshot:
1.  Retrieve `artifacts/risk/risk_metrics.json`.
2.  Verify the detached signature against the publicly published `trusted_attestors.json` (CI Runner key).
3.  Re-run `scripts/ci/compute_risk_metrics.mjs` against the raw artifacts. Output must match exactly.
