 > **If you are an external assessor, start with the [Assessor Quick Start](ASSESSOR_QUICK_START.md).**
>
> It provides a guided, 60-minute review path that is more structured than this general walkthrough.

# Review Pack Walkthrough

This document provides a general orientation to the contents of a release evidence bundle.

## Core Artifacts

*   **`MANIFEST.json`**: A list of all files included in the bundle.
*   **`SHA256SUMS`**: Checksums for all files, allowing for integrity verification.
*   **`decision.json`**: The auditable 'GO' / 'NO-GO' decision for this release.
*   **`EVIDENCE_INDEX.md`**: A human-readable index that maps governance controls to specific evidence artifacts within the bundle.

## Evidence Categories

The artifacts in the bundle are typically organized into the following categories:

*   **`compliance/`**: Artifacts related to automated compliance checks.
*   **`provenance/`**: Data about the origin and build process of the release artifacts.
*   **`reports/`**: Output from various CI jobs, such as test summaries and security scans.
*   **`sbom/`**: Software Bill of Materials in various formats.

## How to Navigate

1.  **Start with `EVIDENCE_INDEX.md`**: Find a control you are interested in.
2.  **Follow the Link**: Click the link to the corresponding evidence artifact.
3.  **Verify Integrity**: Use the `SHA256SUMS` file to verify the checksum of the artifact.
