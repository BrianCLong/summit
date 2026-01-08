# Class Action Risk Factors

This document analyzes the factors that increase the risk of class certification in litigation against CompanyOS.

## Class Certification Requirements (FRCP 23)

For a class to be certified, plaintiffs must prove:

1.  **Numerosity:** The class is so numerous that joinder of all members is impracticable. (Risk: High if breach affects >40 users).
2.  **Commonality:** Questions of law or fact common to the class. (Risk: High if the defect is systemic, e.g., a bug in the `FaceDetectionEngine`).
3.  **Typicality:** Claims of representative parties are typical of the class.
4.  **Adequacy:** Representative parties will fairly and adequately protect the interests of the class.

## Key Risk Factors for CompanyOS

### 1. Uniform Representations (Marketing & Contracts)

- **Risk:** If we make identical promises to all users (e.g., "100% Secure", "Bank-Grade Encryption") in a standard Clickwrap agreement or website footer, it is easier to certify a class for breach of warranty or fraud.
- **Mitigation:**
  - Vary terms based on customer segment (Enterprise vs. Consumer).
  - Avoid broad, unqualified superlatives in marketing.
  - **Action:** Audit `apps/web/src/pages` for "guarantee", "100%", "unhackable".

### 2. Systemic Technical Defects

- **Risk:** A code-level vulnerability (e.g., hardcoded secret, improper salt/hash) affects all users equally. This satisfies "Commonality".
- **Example:** The `ConsensusEngine` secret found in scan (`dev-secret-key`) if used in prod would be a uniform defect.
- **Mitigation:** Unique per-tenant encryption keys (Tenant Isolation). If one tenant is breached, it's an individual issue, not necessarily a class issue.

### 3. Uniform Harm (Statutory Damages)

- **Risk:** Laws with fixed statutory damages (BIPA, TCPA, CCPA) remove the need to prove individual financial loss, making class certification very easy.
- **Mitigation:**
  - **Arbitration Clause with Class Action Waiver:** The most effective defense. (See Epic 3).
  - **Consent Flows:** Ensure BIPA consent is captured _individually_ and _prior_ to collection.

### 4. Centralized Data Architecture

- **Risk:** Monolithic databases where all user data sits in one table (`users`, `identities`) make it look like a single "honeypot".
- **Mitigation:** Sharding or Logical Separation (RLS) helps argue that distinct security controls applied to different tenants, breaking commonality.

## Assessment

**Current Risk Level:** **HIGH**

- **Reason:** Use of Biometric features (`FaceDetectionEngine`) combined with standard SaaS "Clickwrap" terms creates a perfect storm for BIPA class actions.
- **Immediate Action:** Review "Class Waiver" applicability in Terms of Service.
