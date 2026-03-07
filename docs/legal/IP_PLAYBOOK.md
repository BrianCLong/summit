# IP Due Diligence Playbook & Audit Cadence

## Overview

This playbook defines the standard operating procedures for Intellectual Property (IP) protection, verification, and audit within the organization. It is designed to ensure "M&A-ready" status at all times.

## 1. Due Diligence Playbook (M&A Readiness)

### A. Codebase Audit

1.  **Dependency Scan**: Run `scripts/compliance/check_licenses.js` (or equivalent) to generate a BOM (Bill of Materials).
    - _Red Flags_: AGPL, GPL (if linking dynamically without isolation), unmaintained packages.
2.  **Header Verification**: Run `scripts/compliance/scan_headers.js` to ensure all source files have copyright headers.
3.  **Contributor Check**: verify `git log` against the list of employees/contractors with valid IP assignment agreements.
    - _Tool_: `scripts/compliance/check_dco.js` enforces attribution on new commits.

### B. Agreement Verification

1.  **Employee Agreements**:
    - Verify PIIAA (Proprietary Information and Inventions Assignment Agreement) is signed for all active employees.
    - Ensure "Moral Rights" waivers are present where applicable (e.g., EU jurisdictions).
2.  **Contractor Agreements**:
    - Verify "Work made for hire" clauses are explicit.
    - Check for specific assignment of deliverables.

### C. Asset Register Update

- Update `docs/legal/IP_REGISTER.yaml` with any new major modules, models, or datasets.

## 2. Quarterly IP Audit Cadence

**Schedule**: First week of each quarter (Q1 Jan, Q2 Apr, Q3 Jul, Q4 Oct).
**Owner**: CTO / General Counsel (or designate).

### Checklist

1.  [ ] **Run Automated Scans**: Execute full dependency and license scan.
2.  [ ] **Update Inventory**: Review `docs/legal/IP_REGISTER.yaml` for staleness. Add new products/features.
3.  [ ] **Review Contributor List**: Match git authors from the last quarter against HR roster. Flag unknown emails.
4.  [ ] **Patent Harvest**: Review "Patentable Differentiators" (Epic 3) and invention disclosures.
5.  [ ] **Trade Secret Check**: Verify access controls for "Secret" repositories (Epic 4).
6.  [ ] **Executive Sign-off**: Present findings to Exec Team. Sign off on the "Clean State" or "Remediation Plan".

## 3. Remediation Protocols

### A. Missing Provenance / "Tainted" Code

- **Identify**: Code segments that are direct copy-pastes from StackOverflow or unknown GitHub repos without license info.
- **Action**:
  1.  **Rewrite**: Clean-room rewrite of the functionality.
  2.  **Isolate**: Move to a separate service/library if rewrite is impossible immediately.
  3.  **Delete**: If not critical, remove the feature.

### B. Missing Headers

- **Action**: Run auto-fixer or manually apply headers to files identified by `scan_headers.js`.

### C. Unsigned Commits

- **Action**: Enforce "Squash and Merge" with a signed-off commit by a maintainer if the original author cannot sign retroactively.
