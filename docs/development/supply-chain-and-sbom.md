# Supply Chain Security & SBOM Guide

This document outlines the supply chain security practices for the Summit monorepo, including SBOM generation, vulnerability scanning, and build provenance.

## Overview

We aim to produce verifiable artifacts with attached SBOMs and provenance metadata. This allows us to track dependencies, detect vulnerabilities, and ensure build integrity.

## Key Components

### 1. SBOM Generation

We use [Syft](https://github.com/anchore/syft) (via `anchore/sbom-action` in CI) to generate SBOMs in CycloneDX JSON format for our key artifacts:
*   **Server**: `server/sbom.json`
*   **Client (Web)**: `client/sbom.json`

**How to generate locally:**

You can generate an SBOM for the entire repo or a specific directory using the helper script:

```bash
# Generate SBOM for current directory
npm run sbom

# Generate SBOM for a specific target
bash scripts/generate-sbom.sh ./server server-sbom.json
```

### 2. Build Manifest

Every CI build produces a `build-manifest.<sha>.json` file containing:
*   Git commit SHA and branch
*   Build timestamp and run ID
*   Node and pnpm versions
*   List of artifacts produced (with paths to their SBOMs)

This manifest is uploaded as a CI artifact named `*-supply-chain-artifacts`.

### 3. Vulnerability Scanning

We integrate vulnerability scanning into our workflow:
*   **CI**: `pnpm audit` runs in `server-ci.yml` and `client-ci.yml`.
*   **Local**: Run `npm run verify:deps` to check for high-severity vulnerabilities.

### 4. CI/CD Integration

*   **Server CI**: Generates SBOM and Manifest for the server artifact.
*   **Client CI**: Generates SBOM and Manifest for the web client artifact.
*   **Supply Chain Gates**: The `.github/workflows/supply-chain.yml` workflow provides advanced scanning and signing for Docker images (if configured).

## Future Improvements

*   **Signing**: Integrate `cosign` to sign artifacts and manifests.
*   **SLSA**: Work towards SLSA Level 2/3 compliance by hardening the build runner and provenance generation.
*   **Policy**: Enforce stricter policies on allowed licenses and dependencies.
