# Charter: Security & Trust Team

**Owner:** `security-trust-team`
**Escalation:** `ciso`

## 1. Mission

To protect the platform, our customers, and the company by identifying and mitigating security risks, implementing robust security controls, and driving a culture of security across the organization. This team is accountable for the platform's security posture and audit readiness.

## 2. Owned Surfaces

This team has primary ownership of the following repository paths and artifacts:

- **/security/**: All security-related documentation, policies, and automation.
- **/audit/**: All audit-related evidence and automation.
- **/compliance/**: All compliance-related artifacts and mappings.
- **/opa/**: The Open Policy Agent (OPA) policies.
- **Security-related CI/CD jobs** in `.github/workflows/`.
- **Security Evidence Section** of the GA packet.

## 3. Required Artifacts

The Security & Trust Team is required to produce and maintain the following artifacts as part of the GA process:

- **Security Evidence Index:** A manifest of all evidence demonstrating the platform's security posture, including penetration test results, vulnerability scans, and compliance reports.
- **Waiver Policy:** A formal policy and process for managing and approving any exceptions to security controls.
- **Threat Model:** An up-to-date threat model for the Summit platform.

## 4. GA Responsibilities

For the platform to be considered "secure" and ready for a GA release, the Security & Trust Team must:

- **Verify that all GA criteria** related to security have been met.
- **Conduct a final security review** of all new or modified features.
- **Ensure that all P0/P1 security vulnerabilities** have been remediated.
- **Provide a formal attestation** of the platform's security posture for the Go/No-Go packet.

## 5. Guardrails (What This Team May NOT Change Unilaterally)

The Security & Trust Team has the authority to:

- **Block any change** that introduces an unacceptable security risk.
- **Mandate security-related changes** to any part of the platform.

The Security & Trust Team must not:

- **Approve security waivers** without a formal risk assessment and sign-off from the CISO.

## 6. Escalation Path

- For disagreements with other teams regarding security risks, escalate to the **CISO**.
- For critical, un-remediated vulnerabilities, escalate to the **Executive Team**.
All escalations must be documented in the [Decision Log](../DECISION_LOG.md).
