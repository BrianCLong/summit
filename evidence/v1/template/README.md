# Evidence Bundle Template (v1)

This directory contains the standard artifacts required for a compliant release.

## Structure

- **release_notes.md**: Human-readable release notes.
- **changelog.md**: Git-based changelog.
- **security/**:
  - `sbom.cdx.json`: CycloneDX SBOM.
  - `sbom.spdx.json`: SPDX SBOM.
  - `vuln-report.json`: Trivy vulnerability scan report.
  - `signatures.txt`: List of artifact signatures.
- **testing/**:
  - `test-summary.json`: Summary of test execution.
  - `soc-controls.json`: Result of SOC control verification.
- **provenance/**:
  - `slsa-provenance.json`: Build provenance.

## Verification

To verify this bundle, run:
```bash
./scripts/verify-evidence.sh <bundle.tar.gz>
```
