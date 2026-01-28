Owner: Jules
Last-Reviewed: 2025-05-23
Evidence-IDs: policy.governance.drift, policy.evidence.freshness
Status: active

# GA Governance Drift & Evidence Policy

## 1. What is Governed

This policy establishes the governance baseline for the General Availability (GA) readiness of the Summit platform. It governs:

1.  **Critical Workflows**: CI/CD pipelines and security gates defined in `.github/workflows/`, specifically `ga-risk-gate.yml` and `trusted.yml`.
2.  **Governance Documentation**: All policy and procedure documents located in `docs/governance/`.
3.  **Release Artifacts & Evidence**: The creation, verification, and retention of compliance evidence (SBOMs, test results, scan reports).

## 2. Governance Drift

Drift is defined as any deviation from the established governance baseline.

### 2.1 Code & Configuration Drift
*   **Definition**: Any modification to governed files that has not passed the standard pull request review process or violates the `freeze_mode` defined in `docs/policies/trust-policy.yaml`.
*   **Detection**: Automated by `scripts/compliance/check_drift.ts` and `scripts/ci/governance_drift_detector.mjs`.
*   **Scope**:
    *   Files mapped in `compliance/control-map.yaml`.
    *   Critical workflow definitions.

### 2.2 Documentation Drift
*   **Definition**: Governance documents that fail structural integrity checks (missing headers, broken links) or have inconsistent Evidence mappings.
*   **Detection**: Automated by `scripts/ci/verify_governance_docs.mjs` and `scripts/ci/verify_evidence_id_consistency.mjs`.

## 3. Evidence Freshness

To ensure audit validity, evidence must be timely and relevant.

### 3.1 Artifact Freshness
*   **Standard**: Evidence artifacts (e.g., test logs, scan results) must be generated within **24 hours** of the release build.
*   **Detection**: `scripts/ci/collect_fresh_evidence_rate.mjs`.

### 3.2 Documentation Freshness
*   **Standard**: Active governance documents must be reviewed at least every **90 days**.
*   **Detection**: `scripts/ci/verify_governance_docs.mjs` (checks `Last-Reviewed` header).

## 4. Remediation Ownership

| Drift Category | Owner | Representative |
| :--- | :--- | :--- |
| **CI / Workflows** | Platform Engineering | Claude (Systemic/CI) |
| **Security / Secrets** | Security Operations | Security Team |
| **Documentation / Policy** | Governance | Jules (Governance/Docs) |
| **Code / Dependencies** | Engineering | Qwen (Package/Fix) |

## 5. Change Management

Legitimate changes to the governance baseline must follow this process:

1.  **Draft PR**: Submit changes via a Pull Request.
2.  **Validation**: Ensure all governance gates (drift, integrity, consistency) pass.
3.  **Update Baseline**: If adding new artifacts, update `compliance/control-map.yaml`. If adding new policies, update `docs/governance/INDEX.md` and `evidence/map.yml`.
4.  **Approval**: Required from the relevant Owner (see above).

## 6. Exceptions & Escalation

In rare cases, blocking drift or stale evidence may be accepted temporarily.

### 6.1 Exception Protocol
*   **Criteria**: The risk is understood, documented, and mitigated; OR the failure is a false positive waiting on tooling fix.
*   **Process**:
    1.  Log the exception in `docs/governance/EXCEPTION_REGISTER.md` (or `docs/governance/EXCEPTIONS.md`).
    2.  Link to a tracking issue for remediation.
    3.  Obtain Release Captain approval.

### 6.2 Constraints
*   **Maximum Duration**: One release cycle or 30 days, whichever is shorter.
*   **Revalidation**: Must be re-evaluated at the next Weekly GA Ops review.
