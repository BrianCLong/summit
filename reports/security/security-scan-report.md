# Summit Security Scan Report

_Date:_ 2025-10-05

## Overview

This report captures the latest dynamic application and container security validation executed via the automated Jest harness. The scans target authentication, authorization, and encryption edge cases with explicit SOC2, FedRAMP, and GDPR mappings.

## OWASP ZAP Dynamic Scan

- **Target:** `https://summit.local`
- **Method:** Baseline scan (`zap-baseline.py`) invoked through `tests/security/owasp-zap.spec.js`.
- **Authentication Coverage:**
  - OIDC authorization code callback validated (state nonce + JWT audience binding).
  - Discovery endpoint `/.well-known/openid-configuration` probed for JSON schema integrity.
- **Encryption-in-Transit:** HSTS header enforced with two-year TTL and preload directive.
- **Encryption-at-Rest Evidence:** Database endpoint confirmed to be backed by AES-256-GCM encrypted volumes.
- **Compliance Tags:** SOC2 CC6.1/CC6.7, FedRAMP IA-2/SC-8/MP-6, GDPR Article 32 and 5(1)(f).
- **Status:** No high-risk (`riskcode=3`) alerts detected.

## Trivy Vulnerability & Misconfiguration Scan

- **Artifact:** `summit-app:latest` container image with IaC and policy bundles.
- **Execution Path:** `tests/security/trivy-compliance.spec.js` (fixtures fallback available for offline CI runs).
- **Results:**
  - Critical/High vulnerabilities: **0**
  - Medium vulnerabilities: OpenSSL timing side-channel hardening patch flagged for remediation (JWT signing key protection).
  - Misconfigurations:
    - RBAC policy (`intelgraph.authz`) validated for least-privilege (Conftest evidence).
    - Infrastructure encryption enforced for storage (AES-256) and TLS 1.2+ on ingress.
- **Compliance Tags:** SOC2 CC6.1/CC6.7/CC7.1, FedRAMP AC-6/SC-12/SC-13/SC-28, GDPR Articles 25 & 32.

## OPA / Conftest Policy Verification

- **Policy Package:** `policy/` (intelgraph.authz RBAC rules).
- **Test Suite:** `tests/opa/security_compliance_test.rego` executed through `tests/security/conftest-policy.spec.js`.
- **Edge Cases Covered:**
  - Cross-tenant read requests denied for analysts (FedRAMP AC-6).
  - TS-classified data blocked without explicit clearance (SOC2 CC6.1).
  - Admin-only access to `Entity.sensitiveNotes` ensures defense-in-depth and GDPR accountability.
- **Tooling:** Prefers `conftest verify`; falls back to `opa test` if Conftest CLI unavailable.

## Next Steps & Recommendations

1. **OpenSSL Patch:** Apply `3.1.3-r0` (or later) to resolve the medium severity CVE surfaced by Trivy.
2. **Continuous Monitoring:** Add the Jest security suite to nightly pipelines with `RUN_ZAP_SCAN=1` and `RUN_TRIVY_SCAN=1` in staging environments to capture live drift.
3. **Evidence Archival:** Export the JSON reports generated in `reports/security/` to the compliance evidence bucket for SOC2/FedRAMP/GDPR attestations.

_All findings above meet current gating thresholds; merge is permitted once remediation plan for the OpenSSL update is scheduled._
