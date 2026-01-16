# Attestation Publishing Plan

## Overview
This document outlines the strategy for publishing verifiable attestation artifacts (SBOMs, Provenance) to the public Trust Portal.

## Artifact Types

### 1. Software Bill of Materials (SBOM)
*   **Format**: CycloneDX JSON
*   **Safety**: Sanitized to remove internal package names (see `scripts/trust/redact_public_artifacts.ts`).
*   **Publication**:
    *   `artifacts/trust-portal/<tag>/sbom/server-sbom.json`
    *   `artifacts/trust-portal/<tag>/sbom/client-sbom.json`

### 2. SLSA Provenance
*   **Format**: SLSA v0.2 / v1.0 JSON
*   **Safety**: Builder ID and publicly verifiable build inputs (git sha) are preserved. Internal env vars are redacted.
*   **Publication**:
    *   `artifacts/trust-portal/<tag>/provenance/slsa-attestation.json`

## Verification
All published attestations are signed using Cosign. The public key is available via the Trust Portal.

## Pipeline Integration
1.  **Build**: Generate raw SBOM/Provenance.
2.  **Redact**: Run redaction script to produce "Public Safe" versions.
3.  **Sign**: Sign the public versions.
4.  **Publish**: Upload to Trust Portal bucket/site.
