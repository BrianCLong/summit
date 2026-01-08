# SOC-Style Compliance Mapping

This document maps the controls inventoried in `COMPLIANCE_CONTROLS.md` to SOC 2 Trust Services Criteria.

## 1. Security (Common Criteria)

The Security category (also known as Common Criteria) covers the protection of information, software, and infrastructure against unauthorized access and changes.

| SOC 2 Criteria (Illustrative)    | Control ID(s)                          | Evidence Summary                                                                                                                                                                            |
| :------------------------------- | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CC6.1 Logical Access Control** | `GOV-002`, `SEC-002`                   | Human authorization is required for consequential actions. The system enforces strong secret management and production guardrails to prevent unauthorized access due to misconfiguration.   |
| **CC3.2 Change Management**      | `CICD-001`, `CICD-002`, `CICD-003`     | All changes to the production environment are managed through a formal process, enforced by a CI/CD pipeline that includes automated testing, quality gates, and commit message validation. |
| **CC7.1 Risk Mitigation**        | `SEC-001`, `SEC-003`, `THREATMODEL.md` | Risks are identified and mitigated through automated secret scanning, dependency vulnerability analysis, and a documented threat modeling process.                                          |
| **CC7.2 Security Monitoring**    | `AUD-002`                              | The system is designed with an immutable ledger for all significant events, providing a basis for monitoring and audit.                                                                     |

## 2. Availability (Illustrative)

The Availability category addresses the accessibility of the system as stipulated by a contract or service level agreement.

| SOC 2 Criteria (Illustrative)         | Control ID(s) | Evidence Summary                                                                                                                                                   |
| :------------------------------------ | :------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1.1 Capacity Management**          | `GOV-005`     | The standardization protocol, overseen by the Architecture Council, ensures that changes are reviewed for their impact on system stability and scalability.        |
| **A1.2 System Monitoring & Recovery** | `CICD-003`    | The "Golden Path" smoke test continuously validates the core functionality of the system, ensuring that critical services are available and operating as expected. |

## 3. Confidentiality (Illustrative)

The Confidentiality category addresses the protection of "confidential" information, as defined by the organization.

| SOC 2 Criteria (Illustrative)             | Control ID(s)        | Evidence Summary                                                                                                                                     |
| :---------------------------------------- | :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1.1 Data Classification & Protection** | `SEC-001`, `SEC-002` | The system protects confidential information (e.g., secrets, credentials) through automated scanning and strict production configuration validation. |
| **C1.2 Access Restriction**               | `GOV-002`            | All actions are tied to human intent, providing a foundation for enforcing access controls based on the principle of least privilege.                |

## 4. Not Applicable Controls

Certain SOC 2 criteria may not be applicable to the Summit platform at this stage. For example, criteria related to physical security of data centers are managed by our cloud infrastructure providers.
