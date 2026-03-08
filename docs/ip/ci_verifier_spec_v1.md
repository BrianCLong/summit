# CI Verifier Specification: IP Governance Gates v1

This document specifies the automated verification requirements for IP-related governance gates, ensuring that policy changes, auditor access, and safety-case integrity are enforced by the CI/CD pipeline.

---

## 1. Policy RFC Gate

### 1.1 Trigger

- Any modification to a governance policy bundle or a change in the `policy_bundle_hash` within the configuration.

### 1.2 Verification Requirements

- **RFC Artifact**: A valid Policy RFC artifact must be present in the `evidence/` directory for the current PR.
- **RFC ID Consistency**: The RFC identifier in the artifact must match the identifier provided in the change request.
- **Approval Quorum**: The artifact must contain cryptographic signatures from at least two distinct authorized roles (e.g., Compliance and Operations).
- **Policy Delta Report**: The CI process must generate a delta report describing all differences between the current and proposed policy bundles.

### 1.3 Failure Condition

- Mismatching RFC ID, insufficient signatures, or missing delta report must block the merge to the `main` branch.

---

## 2. Auditor Mode Gate

### 2.1 Trigger

- Any modification to the auditor interface code, auditor export utilities, or auditor-related RBAC policies.

### 2.2 Verification Requirements

- **Read-Only Enforcement**: Verify that the auditor role lacks `write`, `execute`, or `approve` permissions across all governed services.
- **Redaction Verification**: Automated tests must confirm that fields marked as `NEVER_LOG` or containing sensitive PII/PHI/Financial data are masked or omitted in auditor views and exports.
- **Hashed Identifiers**: Ensure that restricted data fields are replaced with deterministic hashed identifiers rather than raw values.

### 2.3 Failure Condition

- Detection of any execution privilege for the auditor role or any leakage of unredacted sensitive fields.

---

## 3. Safety-Case Gate

### 3.1 Trigger

- Any defense action categorized as "External Publishing" or any update to the safety-case argument graph.

### 3.2 Verification Requirements

- **Node Mapping**: Every external publishing defense action must reference at least one safety requirement node in the argument graph.
- **Claim-Evidence Integrity**: Each referenced node must be linked to a valid evidence ID and a current verification proof artifact.
- **Validity Window**: Verification proof artifacts must be within their defined validity window (e.g., generated within the last 24 hours).

### 3.3 Failure Condition

- Missing or invalid links to evidence, or expired proof artifacts, must trigger a "fail-closed" state, blocking the associated defense action.
