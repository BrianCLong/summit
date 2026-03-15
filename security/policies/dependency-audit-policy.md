# Dependency Audit Policy

## Overview
To ensure the security and compliance of the Summit platform, all third-party dependencies must undergo regular auditing and comply with our licensing and security standards.

## Allowed License Types
The following licenses are generally pre-approved for use in the Summit project:
- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC

Any other license types (e.g., GPL, LGPL, AGPL) require explicit approval from the legal and security teams.

## Banned Packages
The following packages or categories of packages are strictly prohibited:
- Packages with known "Critical" vulnerabilities that have remained unpatched for more than 30 days.
- Packages that are no longer maintained (no updates for >2 years) without a specific exemption.
- Packages with "Copyleft" licenses (GPL, AGPL) without legal clearance.

## Audit Cadence
- **Automated Audit:** Every Pull Request and weekly on the `main` branch.
- **Manual Review:** Quarterly deep-dive into the dependency tree to identify and remove unused or redundant packages.
- **Critical Vulnerability Response:** Immediate (within 24 hours) triage and remediation of any "Critical" or "High" severity vulnerabilities discovered.

## Enforcement
Dependencies are enforced via `security/scripts/audit-deps.sh` in the CI pipeline.
