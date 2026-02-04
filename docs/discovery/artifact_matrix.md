# Artifact Matrix (Top Ecosystems)

## Summit Readiness Assertion
This matrix aligns with `docs/SUMMIT_READINESS_ASSERTION.md`.

## Artifact Classes (Intentionally constrained to primary formats)
1. **OCI Images**
   - Digest: `sha256` from registry manifest.
   - Metadata: attach SBOM + provenance in evidence bundle.
2. **Service Tarballs**
   - Digest: `sha256` of release tarball.
   - Metadata: include SBOM + provenance + signature files.
3. **Language Packages**
   - Digest: `sha256` over package archive.
   - Metadata: attach SBOM + provenance in evidence bundle.

## Next Actions
- Confirm publishing endpoints and storage registries for each class.
- Record authoritative digest calculation procedures per pipeline.
