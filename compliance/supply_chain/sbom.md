# SBOM Requirements

## Minimum Fields

- Package name, version, supplier
- Hashes (SHA-256 or stronger)
- License identifiers and allowlist status
- Build provenance reference

## Validation Steps

1. Validate SBOM presence prior to connector execution.
2. Verify license allowlist status.
3. Store validation result in assurance report.
4. Gate execution using policy-as-code.

## Evidence Artifacts

- SBOM file (SPDX or CycloneDX)
- Validation logs with hash of SBOM
- Assurance report entries
