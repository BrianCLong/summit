# SBOM Governance Policy

## Overview
This policy governs the generation, verification, and consumption of Software Bill of Materials (SBOMs) within the Summit platform.

## Policy Rules

### 1. Toolchain Pinning
- **All SBOM generation tools** must be pinned to a specific version or commit SHA.
- **GitHub Actions:** Must use specific commit SHAs (e.g., `uses: anchore/sbom-action@<SHA>`). Floating tags (e.g., `@v0`) are **prohibited**.
- **CLIs:** Tools like `syft`, `melange`, etc., must have their versions explicitly recorded in the build manifest.

### 2. Melange Guard
- Due to **CVE-2026-25145** (Path Traversal), any usage of `melange` must be version **0.40.3 or higher**.
- Builds using older versions must fail immediately.

### 3. SBOM Linting
- All generated SBOMs must be linted for:
  - **Path Traversal:** No file paths containing `../` or absolute system paths (e.g., `/etc/`).
  - **Secrets:** No embedded keys or sensitive tokens (e.g., PEM headers).
  - **Size:** License text blobs must not exceed defined limits to prevent exfiltration.

### 4. Provenance Verification
- **Signing:** All SBOMs and their manifests must be signed using `cosign`.
- **Verification:** The signature must be verified before the artifact is consumed or released.
- **Attestation:** SBOMs should be attached as attestations to the build artifact where possible.

## Enforcement
- These policies are enforced via CI/CD gates in `.github/workflows/sbom-scan.yml` and `.github/workflows/policy-pinned-actions.yml`.
