# Software Bill of Materials (SBOM)

This document describes how we generate SBOMs, the policies we evaluate against them, and how to reproduce the same steps locally.

## What we generate in CI

Pull requests and pushes to `main` produce a CycloneDX and SPDX SBOM, signed using **Cosign Keyless OIDC**.

The pipeline:
1. Installs [Syft](https://github.com/anchore/syft) and [Cosign](https://github.com/sigstore/cosign) on the runner.
2. Builds the artifacts via `scripts/release/build-artifacts.ts`.
3. Generates SBOMs:
   - `sbom.spdx.json` (SPDX)
   - `sbom.cdx.json` (CycloneDX)
4. **Signs the SBOMs** using Cosign's keyless OIDC mode (using the GitHub Actions workload identity). This produces `.sig` (signature) and `.pem` (certificate) files.
5. Uploads all artifacts.
6. Attests the build provenance using `actions/attest-build-provenance`.

**Gate:** The build **fails** if signing cannot be completed (e.g., OIDC failure).

## Generating locally

### Prerequisites

- Node.js 18+
- [Syft](https://github.com/anchore/syft) installed on your PATH
- [Cosign](https://github.com/sigstore/cosign) installed on your PATH

### Commands

Generate the SBOM:

```bash
syft . -o spdx-json=sbom.spdx.json
```

Sign (requires interactive OIDC login or a key):

```bash
cosign sign-blob --yes sbom.spdx.json --output-signature sbom.spdx.json.sig --output-certificate sbom.spdx.json.pem
```

## How the SBOM is used

- **Supply chain visibility:** Inventories application and OS dependencies.
- **Provenance:** The signature and attestation prove that the artifact was built in a trusted CI environment.
- **Gate Enforcement:** Downstream deployment pipelines verify the Cosign signature and GitHub Attestation before allowing deployment.
