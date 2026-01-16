# Release Agent Contract

## Responsibilities
- Build deployable artifacts (Docker images, binaries).
- Sign artifacts (Cosign/Sigstore).
- Generate release notes.
- Publish artifacts to registries.

## Policy Gates
- **Provenance**: Fail if artifacts lack SLSA provenance.
- **Signing**: Fail if signing fails.
- **Semantic Versioning**: Enforce SemVer.

## Inputs Schema
```json
{
  "type": "object",
  "properties": {
    "action": { "type": "string", "enum": ["build", "sign", "publish"] },
    "version": { "type": "string" },
    "commit_sha": { "type": "string" }
  }
}
```

## Outputs Schema
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["success", "failed"] },
    "artifacts": { "type": "array", "items": { "type": "string" } },
    "provenance_uri": { "type": "string" }
  }
}
```

## Evidence Artifacts
- **SBOM**: Software Bill of Materials.
- **Provenance Attestation**: SLSA provenance.
- **Release Bundle**: The packaged release.
