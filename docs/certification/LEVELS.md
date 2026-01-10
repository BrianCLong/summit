# Certification Levels

This document defines the three standard levels of certification available across all domains (Deployments, Operators, Plugins, Partners).

## 1. Level 1: Baseline

**Definition:** Self-attested compliance with automated checks.

**Guarantees:**
*   Syntactic correctness (e.g., valid config, schema compliance).
*   Basic security hygiene (e.g., no known high-severity vulnerabilities in dependencies).
*   License compliance.

**Limitations:**
*   No protection against malicious intent.
*   No guarantee of operational excellence.
*   Relies on the honesty of the self-attesting party.

**Requirements:**
*   Automated linter pass.
*   Signed Terms of Service.
*   Basic identity verification (e.g., email/domain).

## 2. Level 2: Verified

**Definition:** Validated by the Platform Authority via remote evidence collection and identity proofing.

**Guarantees:**
*   Identity verified (know your customer/partner).
*   Runtime integrity verified (e.g., running signed binaries).
*   Policy compliance enforced by platform controls.
*   Passing grade on standard functional tests.

**Limitations:**
*   Does not guarantee internal process maturity.
*   Does not cover physical security (unless cloud-provider inherited).

**Requirements:**
*   **Baseline** requirements met.
*   Cryptographic signing of artifacts.
*   Successful execution of the "Conformance Test Suite".
*   Manual review of architectural design (lightweight).

## 3. Level 3: Audited

**Definition:** Reviewed by an independent third-party auditor against rigorous standards (e.g., SOC 2, ISO 27001 mappings).

**Guarantees:**
*   Process maturity and adherence.
*   Deep security audit (penetration testing).
*   Business continuity and disaster recovery readiness.
*   Financial stability (for partners).

**Limitations:**
*   Point-in-time assessment (requires regular renewal).

**Requirements:**
*   **Verified** requirements met.
*   Third-party audit report (clean opinion).
*   On-site or deep virtual inspection.
*   SLA commitments with financial backing.
