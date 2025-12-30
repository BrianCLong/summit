# SBOM & Provenance Attestation

Defines required SBOM schema, provenance attestations, and enforcement for connector and transform packages.

- **SBOM fields:** component name, version, license, hash, supplier, relationship; validated against allowlist.
- **Provenance:** SLSA-style provenance attestation binding build steps to artifact digest and signer identity.
- **Execution policy:** allowed network destinations, effect class (READ/WRITE/EXPORT), rate limits, classification scope.
- **Assurance report commitment:** Merkle root over outputs with attestation validation status and egress receipt summary.
- **Transparency:** assurance digests stored in append-only ledger; invalid or unsigned packages blocked.
