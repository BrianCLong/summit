# Evidence Bundle Schema

## Overview

The Evidence Bundle is a cryptographically signed archive produced for every GA release. It contains the "proof of work" for compliance, security, and quality claims.

## Directory Structure

```text
evidence/ga/
├── sbom/
│   ├── server-sbom.json       # CycloneDX SBOM for Server
│   ├── client-sbom.json       # CycloneDX SBOM for Client
│   └── ...
├── test-results/
│   ├── junit-server.xml       # Server Unit Test Results
│   ├── coverage-summary.json  # Code Coverage Report
│   └── policy-check.log       # OPA Policy Evaluation Log
├── provenance/
│   ├── build-manifest.json    # Build Metadata (Commit, Date, Builder ID)
│   └── slsa-attestation.json  # SLSA Provenance
└── signatures/
    ├── server-sbom.json.sig   # Cosign signature for Server SBOM
    └── ...                    # Signatures for all critical files
```

## Manifest Schema (`build-manifest.json`)

```json
{
  "version": "1.0.0",
  "commit": "sha1...",
  "branch": "release/v1.0",
  "builder": "GitHub Actions",
  "timestamp": "2023-10-27T10:00:00Z",
  "artifacts": [
    {
      "name": "server-sbom.json",
      "sha256": "..."
    }
  ]
}
```

## Verification

To verify the bundle:

1.  Extract the tarball.
2.  For each file in `sbom/` or `test-results/`:
    - Locate the corresponding `.sig` file.
    - Run `cosign verify-blob --key <pubkey> --signature <file.sig> <file>`.
