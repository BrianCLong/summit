# ISO-Style Compliance Mapping

This document maps the controls inventoried in `COMPLIANCE_CONTROLS.md` to ISO 27001-style security domains.

## 1. Information Security Policies (A.5)

| ISO Domain (Illustrative)      | Control ID(s)                           | Evidence Summary                                                                                                                                                                              |
| :----------------------------- | :-------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A.5.1 Management Direction** | `GOV-001`, `GOV-003`, `CONSTITUTION.md` | The organization's information security policies are defined at the highest level in the Constitution, which establishes a clear direction and set of principles for governance and security. |

## 2. Access Control (A.9)

| ISO Domain (Illustrative)             | Control ID(s)        | Evidence Summary                                                                                                                                                                                           |
| :------------------------------------ | :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A.9.4 System & Application Access** | `GOV-002`, `SEC-002` | Access to systems and applications is controlled through a principle of human-led authorization, reinforced by technical guardrails that prevent the use of default or insecure credentials in production. |

## 3. Cryptography (A.10)

| ISO Domain (Illustrative)         | Control ID(s)    | Evidence Summary                                                                                                                                                               |
| :-------------------------------- | :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A.10.1 Cryptographic Controls** | `THREATMODEL.md` | The threat model for the Provenance Ledger Service explicitly calls for the use of cryptographic controls, including mTLS, JWT authentication, and encryption of data at rest. |

## 4. System Acquisition, Development & Maintenance (A.14)

| ISO Domain (Illustrative)                   | Control ID(s)                                | Evidence Summary                                                                                                                                                                                      |
| :------------------------------------------ | :------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A.14.1.1 Security Requirements Analysis** | `THREATMODEL.md`                             | Security requirements are analyzed and specified through a formal threat modeling process.                                                                                                            |
| **A.14.2.1 Secure Development Policy**      | `CICD-001`, `CICD-004`, `SEC-001`, `SEC-003` | A secure development policy is enforced through an automated CI/CD pipeline that includes static analysis, secret scanning, vulnerability checks, and evidence bundle validation (SBOM + provenance). |
| **A.14.2.8 System Security Testing**        | `CICD-003`                                   | System security and functionality are validated through automated "Golden Path" smoke tests before changes are merged.                                                                                |

## 5. Supplier Relationships (A.15)

| ISO Domain (Illustrative)                 | Control ID(s) | Evidence Summary                                                                                            |
| :---------------------------------------- | :------------ | :---------------------------------------------------------------------------------------------------------- |
| **A.15.2.1 Monitoring Supplier Services** | `SEC-003`     | The security of the software supply chain is monitored through automated dependency vulnerability scanning. |

## 6. Information Security Incident Management (A.16)

| ISO Domain (Illustrative)           | Control ID(s) | Evidence Summary                                                                                         |
| :---------------------------------- | :------------ | :------------------------------------------------------------------------------------------------------- |
| **A.16.1.7 Information Collection** | `AUD-002`     | The immutable provenance ledger serves as a foundational source of evidence for incident investigations. |

## Intentional Deviations

Summit's governance model, as defined in the Constitution, prioritizes verifiable, code-enforced controls over traditional process documentation. As such, some ISO domains that are typically satisfied by written policies are instead satisfied by auditable CI/CD configurations and source code.
