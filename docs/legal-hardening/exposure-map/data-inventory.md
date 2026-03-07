# Data Inventory & Legal Regime Mapping

This document inventories the types of data processed by CompanyOS and maps them to applicable legal regimes.

**Generated:** 2025-10-25
**Status:** DRAFT

## 1. Data Inventory Analysis

The following data types have been identified through automated scanning of the codebase and manual review.

### PII (Personally Identifiable Information)

| Data Type                 | Locations Detected                                                                                  | Sensitivity | Legal Regime                      |
| :------------------------ | :-------------------------------------------------------------------------------------------------- | :---------- | :-------------------------------- |
| **Email Address**         | `server/src/auth/types.ts`, `server/src/app.ts`, `server/src/ai/copilot/guardrails.service.ts`      | High        | GDPR, CCPA/CPRA, CAN-SPAM         |
| **Passwords**             | `server/src/audit/index.ts` (Redis config), `server/src/agents/swarm/ConsensusEngine.ts` (Secrets)  | Critical    | Security Breach Notification Laws |
| **Phone Numbers**         | `server/src/ai/copilot/guardrails.service.ts`                                                       | High        | GDPR, CCPA, TCPA                  |
| **SSN (Social Security)** | `server/src/ai/copilot/guardrails.service.ts`, `server/src/ai/copilot/redaction.service.ts`         | Critical    | Privacy Act, State Breach Laws    |
| **Physical Address**      | `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts`                                                | Medium      | GDPR, CCPA                        |
| **Location / GPS**        | `server/src/ai/nl-graph-query/query-patterns.ts` (`latitude`, `longitude`)                          | High        | GDPR, CCPA (Sensitive PI)         |
| **UUIDs / Identifiers**   | Widespread usage (`server/src/audit/audit-types.ts`, `server/src/analysis/GraphAnalysisService.ts`) | Low/Medium  | GDPR (Pseudonymous Data)          |

### Biometric Data

| Data Type            | Locations Detected                                                                | Sensitivity | Legal Regime                                           |
| :------------------- | :-------------------------------------------------------------------------------- | :---------- | :----------------------------------------------------- |
| **Face Data**        | `server/src/ai/engines/FaceDetectionEngine.ts` (features, landmarks, boundingBox) | Critical    | BIPA (IL), CUBI (TX), GDPR (Special Category)          |
| **Gender Estimates** | `server/src/ai/engines/FaceDetectionEngine.ts`                                    | High        | GDPR (Special Category potential), Anti-Discrimination |
| **Emotion Analysis** | `server/src/ai/engines/FaceDetectionEngine.ts`                                    | High        | EU AI Act (potential high risk)                        |

### Security & Access Data

| Data Type          | Locations Detected                                            | Sensitivity | Legal Regime                   |
| :----------------- | :------------------------------------------------------------ | :---------- | :----------------------------- |
| **Auth Tokens**    | `server/src/auth/github-actions-oidc.ts`, `server/src/app.ts` | Critical    | Security Standards (SOC2, ISO) |
| **Secrets / Keys** | `server/src/agents/swarm/ConsensusEngine.ts`                  | Critical    | Security Standards             |
| **IP Addresses**   | `server/src/audit/audit-types.ts`                             | Medium      | GDPR (Personal Data)           |

## 2. Legal Regime Mapping

| Regime                     | Applicability                                                                                               | Key Requirements                                                                                                                              |
| :------------------------- | :---------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **GDPR (EU)**              | Applies to Email, Phone, IP, Biometrics (Face), Location.                                                   | - Lawful basis for processing<br>- Data Subject Rights (Access, Delete)<br>- 72h Breach Notification<br>- DPIA for Biometrics                 |
| **CCPA/CPRA (California)** | Applies to all PII. "Sensitive PI" includes Location, Biometrics, SSN.                                      | - Right to Limit Use of Sensitive PI<br>- "Do Not Sell/Share" opt-out<br>- 12-month lookback on access requests                               |
| **BIPA (Illinois)**        | Applies specifically to `FaceDetectionEngine` outputs (face geometry).                                      | - Written release required _before_ collection<br>- Retention schedule required<br>- Prohibition on profiting from data                       |
| **HIPAA (US)**             | Potentially applies if Health data is processed (not explicitly found in scan but `PHI` mentioned in epic). | - Business Associate Agreement (BAA)<br>- Security Rule (Encryption)<br>- Privacy Rule (Minimum Necessary)                                    |
| **EU AI Act**              | Applies to `FaceDetectionEngine` (Biometric Identification/Categorization).                                 | - High-Risk AI System obligations<br>- Transparency/Registration<br>- Prohibited practices (e.g., untargeted scraping for facial recognition) |

## 3. Risk Assessment

- **Critical Risk:** The presence of `FaceDetectionEngine` and `SSN` redaction logic implies the system is capable of handling highly sensitive data. BIPA class action risk is significant if facial recognition is deployed without strict consent flows.
- **High Risk:** Location data (`latitude`, `longitude`) combined with Identity can lead to stalking/surveillance claims.
- **Compliance Gap:** Ensure `FaceDetectionEngine` has a hard toggle to be disabled for customers in BIPA jurisdictions (IL, TX, WA) unless specific compliance workflows are enabled.

## 4. Recommendations

1.  **Biometric Gate:** Implement a strict configuration gate for `server/src/ai/engines/FaceDetectionEngine.ts`. It should default to `DISABLED` unless explicitly enabled with a signed addendum.
2.  **SSN/PCI Redaction:** Verify that the redaction logic in `server/src/ai/copilot/redaction.service.ts` is applied _before_ logging or storage in the `ProvenanceLedger`.
3.  **Data Residency:** Add metadata to `Tenant` objects to track jurisdiction (EU vs US) and enforce storage location policies for the identified PII types.
