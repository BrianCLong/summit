# Assurance Profiles

Assurance Profiles provide pre-packaged views of the system's claims tailored for specific consumers (e.g., auditors, regulators, customers).

## Available Profiles

### 1. Enterprise Security Review (`profile_security_review`)

Tailored for CISO/Security Architect review.

*   **Objective**: Verify the security posture and vulnerability management.
*   **Required Claims**:
    *   `security.vulnerability.scan.passed`
    *   `security.access.mfa.enforced`
    *   `security.supply_chain.sbom.present`
    *   `security.supply_chain.signature.valid`
*   **Exclusions**: Operations metrics not relevant to security.

### 2. Operational Reliability (`profile_ops_reliability`)

Tailored for SRE/Ops audits.

*   **Objective**: Verify system reliability and recovery capabilities.
*   **Required Claims**:
    *   `operations.slo.compliance.met`
    *   `operations.backup.verified`
    *   `operations.dr.drill.recent`
*   **Exclusions**: Detailed governance logs.

### 3. Governance & Compliance (`profile_governance`)

Tailored for Compliance Officers (SOC2, GDPR).

*   **Objective**: Verify adherence to policy and data residency.
*   **Required Claims**:
    *   `governance.policy.compliant`
    *   `governance.audit.logging.active`
    *   `governance.data.sovereignty.verified`
    *   `provenance.data.lineage.complete`

### 4. AI Safety & Provenance (`profile_ai_safety`)

Tailored for AI Risk assessments.

*   **Objective**: Verify AI model provenance and safety guardrails.
*   **Required Claims**:
    *   `provenance.code.traceable`
    *   `provenance.data.lineage.complete`
    *   `governance.policy.compliant` (specifically AI policies)

## Usage

When requesting an attestation, specify the `profile` query parameter:

```http
GET /api/assurance/attestation?profile=profile_security_review
```

The engine will filter claims to match the profile and validate that all required claims are present.
