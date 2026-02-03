# Standard: SBOM & Provenance (CycloneDX v1.7)

**Standard ID**: STD-005-SBOM-PROVENANCE
**Version**: 1.0.0
**Status**: ACTIVE
**Owner**: Platform Engineering / Security & Trust

## 1. Overview

This standard defines the requirements for Software Bill of Materials (SBOM) and Build Provenance within the Summit (IntelGraph) ecosystem. It mandates the use of CycloneDX v1.7 and GitHub Artifact Attestations to ensure maximum transparency, auditability, and supply chain security.

## 2. SBOM Requirements (CycloneDX v1.7)

All software components produced by Summit must be accompanied by a CycloneDX v1.7 JSON SBOM.

### 2.1 Cryptographic Bill of Materials (CBOM)

SBOMs must include a `cryptography` section for all cryptographic assets. This is critical for:
- Auditing cryptographic strength.
- Compliance with post-quantum security standards.
- Identifying vulnerable algorithm families.

### 2.2 Intellectual Property & Evidence

SBOMs must leverage the v1.7 `evidence` and `ip` metadata fields to document:
- Licenses and copyrights.
- Data provenance (where data/code came from).
- Structured citations for every bit of BOM data.

### 2.3 Required Fields

- `bomFormat`: Must be "CycloneDX".
- `specVersion`: Must be "1.7".
- `metadata.manufacture`: Must include vendor and contact information.
- `components`: Every component must have a `purl` and appropriate `hashes`.

## 3. Build Provenance (GitHub Attestations)

Summit uses native GitHub Artifact Attestations to anchor build evidence.

### 3.1 Build Provenance Attestations

Generated using `actions/attest-build-provenance`.
- **Format**: SLSA v1.0 / in-toto.
- **Signing**: Keyless Sigstore signatures.
- **Scope**: Must cover all released binaries, containers, and installers.

### 3.2 SBOM Attestations

Generated using `actions/attest-sbom`.
- Binds the artifact identity to its validated SBOM.
- Stored and verifiable via GitHub CLI (`gh attestation verify`).

## 4. Verification

Verification of SBOM and Provenance is integrated into the GA Gate.

```bash
# Verify Build Provenance
gh attestation verify <artifact-path> --repo <repo-name>

# Verify SBOM Attestation
gh attestation verify <artifact-path> --repo <repo-name> --type sbom
```

## 5. Compliance

Failure to produce valid v1.7 SBOMs or signed attestations will block General Availability (GA) releases.

---
*End of Standard*
