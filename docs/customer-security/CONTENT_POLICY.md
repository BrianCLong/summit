# Customer Security Content Policy

**Version:** 1.0.0
**Enforcement:** CI/CD + Manual Review for Policy Changes

## Purpose

To ensure that no sensitive, internal-only, or potentially compromising information is accidentally leaked to customers or the public via the Customer Security Package.

## Classification & Redaction Rules

### 1. Banned Content Patterns (Redact or Reject)

The following patterns must **never** appear in Customer-Only or Public artifacts:

*   **Secrets/Credentials**: AWS keys, API tokens, private keys, passwords, connection strings with embedded credentials.
*   **Internal Identifiers**: Employee names/emails (use role accounts), internal IP addresses (unless example/rfc1918), internal hostnames that reveal topology secrets.
*   **Vulnerability Specifics**:
    *   Raw scan reports (Trivy/Snyk JSONs) showing unpatched CVEs.
    *   Specific steps to reproduce open zero-days.
    *   Internal ticket links (Jira, Linear) that are not public.
*   **Future Plans**: "Planned" features must be clearly labeled. No "Coming soon" promises that contractually bind us without legal review.

### 2. Inclusion Rules (What goes in)

*   **Policies**: Approved policy text from `docs/policies/` or `docs/security/`.
*   **Evidence**:
    *   **Test Results**: Aggregated pass/fail counts, coverage percentages (NOT raw logs with potential sensitive data).
    *   **SBOMs**: Standard CycloneDX/SPDX format.
    *   **Provenance**: Build identity and source links.
*   **Architecture**: High-level diagrams, data flow descriptions, boundary definitions.

## Approval Workflow

1.  **Content Changes**: Any change to `docs/customer-security/` requires review by [Security Engineering].
2.  **Script Changes**: Changes to `scripts/customer-security/` (redaction logic) require review by [Security Engineering] AND [Release Engineering].
3.  **Release Gate**: The `verify_customer_security_package` script runs in CI. If it detects banned patterns or integrity failures, the release is blocked.

## Disclaimer

> "This package is provided for information purposes only and does not constitute a warranty or guarantee of security. The information is current as of the version date."
