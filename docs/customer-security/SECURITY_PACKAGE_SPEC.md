# Customer Security Package Specification

**Version:** 1.0.0
**Owner:** Security Engineering
**Audience:** Procurement, Security Reviewers, Solution Architects, Auditors

## Overview

The Customer Security Package is a standardized, versioned artifact bundle designed to streamline vendor risk assessments and accelerate customer adoption. It is generated deterministically for each release tag and provides a safe-to-share subset of our internal evidence and documentation.

## Artifact Classes

All artifacts in the repository are classified into one of three levels:

1.  **Public**: Safe for open distribution (e.g., this spec, public documentation, open-source code).
2.  **Customer-Only**: Available to verified customers/prospects under NDA. Contains internal configurations, specific architectural details, and detailed security evidence.
3.  **Internal**: Strictly for internal use. Contains raw vulnerability reports, sensitive keys, employee personal data, and unredacted audit logs.

**The Customer Security Package consists of PUBLIC and CUSTOMER-ONLY artifacts.**

## Package Contents

The package is distributed as a ZIP archive or secure portal download, structured as follows:

```text
customer-security-package-<version>/
├── OVERVIEW.md                     # Executive summary and how to use this package
├── CONTROLS_SUMMARY.md             # High-level mapping of controls to evidence
├── questionnaires/
│   ├── sig-lite.md                 # Standard SIG Lite responses
│   └── caiq-lite.md                # Standard CAIQ Lite responses
├── artifacts/
│   ├── sbom/                       # Software Bill of Materials (Redacted/Safe)
│   ├── provenance/                 # SLSA Provenance (Builder/Source identity)
│   └── third-party-licenses.txt    # Aggregated license info
├── hardening/
│   ├── cloud-deployment.md         # AWS/Cloud hardening guide
│   ├── onprem-deployment.md        # On-premise hardening guide
│   └── tenancy-isolation.md        # Tenancy model and isolation proofs
├── policies/
│   ├── VULNERABILITY_DISCLOSURE.md # VDP Policy
│   └── SECURITY_CONTACT.md         # Contact and escalation info
└── verification/
    ├── SHA256SUMS                  # Checksums for all files
    └── verification-instructions.md # How to verify integrity
```

## Versioning

The package version strictly matches the Summit Product Release version (e.g., `v1.2.3`).
Generation is triggered automatically on release tag creation.

## Integrity

*   **Determinism**: Re-running the generation script on the same git commit must produce the exact same bit-for-bit output (excluding independent timestamps if unavoidable, though we strive for reproducible builds).
*   **Provenance**: The package itself is signed.
*   **Traceability**: Every document links back to a specific immutable policy or evidence artifact in the source repo.

## Distribution

*   **Distribution Method**: Trust Portal (primary) or Secure Email/File Share (secondary).
*   **Access Control**: Requires NDA for "Customer-Only" content.
