# Release Bundle SBOM

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Release Bundle SBOM is a **CycloneDX 1.5 JSON** document that describes the release bundle itself (not the source code dependencies). It provides a standards-friendly inventory of all files included in the bundle, making it portable across security tooling and giving auditors a familiar artifact to ingest.

### Purpose

- **Audit Trail**: Provides a standardized inventory for compliance audits
- **Tooling Integration**: Works with existing SBOM scanners and viewers
- **Integrity Verification**: Each file is listed with its SHA-256 hash
- **Self-Description**: Bundle is fully described without relying on filename conventions

---

## Format Specification

### CycloneDX Version

We use **CycloneDX 1.5** JSON format for the bundle SBOM:

- Mature specification with wide tooling support
- Supports file-level components with hash algorithms
- External references for linking related artifacts
- Machine-readable and human-inspectable

### Schema Location

```
artifacts/release/<tag>/sbom/bundle.cdx.json
```

---

## SBOM Structure

### Top-Level Fields

| Field                | Description                             |
| -------------------- | --------------------------------------- |
| `bomFormat`          | Always `CycloneDX`                      |
| `specVersion`        | Always `1.5`                            |
| `serialNumber`       | URN identifier for this SBOM instance   |
| `version`            | SBOM document version (always `1`)      |
| `metadata`           | Bundle identity and generation metadata |
| `components`         | Array of bundle file entries            |
| `externalReferences` | Links to related artifacts              |

### Metadata Section

```json
{
  "metadata": {
    "component": {
      "type": "application",
      "bom-ref": "summit-release-bundle",
      "name": "summit-release-bundle",
      "version": "v4.1.2",
      "description": "Summit Platform GA Release Bundle",
      "purl": "pkg:generic/summit-release-bundle@v4.1.2"
    },
    "properties": [
      { "name": "bundle:tag", "value": "v4.1.2" },
      { "name": "bundle:commit", "value": "a8b1963..." },
      { "name": "bundle:kind", "value": "ga" }
    ]
  }
}
```

### Components Section

Each file in the bundle is represented as a component:

```json
{
  "components": [
    {
      "type": "file",
      "bom-ref": "file:provenance.json",
      "name": "provenance.json",
      "description": "Master provenance manifest",
      "hashes": [
        {
          "alg": "SHA-256",
          "content": "abc123..."
        }
      ],
      "properties": [
        { "name": "bundle:role", "value": "provenance" },
        { "name": "bundle:required", "value": "true" }
      ]
    }
  ]
}
```

### External References

```json
{
  "externalReferences": [
    {
      "type": "bom",
      "url": "sbom/source.cdx.json",
      "comment": "Source code SBOM (CycloneDX)"
    },
    {
      "type": "bom",
      "url": "sbom/container.cdx.json",
      "comment": "Container image SBOM (CycloneDX)"
    }
  ]
}
```

---

## Bundle File Roles

Each file in the bundle SBOM has a `bundle:role` property from a controlled vocabulary:

| Role                 | Description                    | Required (GA) | Required (RC) |
| -------------------- | ------------------------------ | ------------- | ------------- |
| `provenance`         | Master provenance manifest     | Yes           | Yes           |
| `hashes`             | SHA256SUMS checksum file       | Yes           | Yes           |
| `bundle_index`       | Bundle inventory index         | Yes           | Yes           |
| `release_notes`      | GitHub release markdown        | Yes           | Yes           |
| `sbom_source`        | Source code SBOM               | Yes           | No            |
| `sbom_container`     | Container image SBOM           | No\*          | No            |
| `sbom_bundle`        | This bundle SBOM               | Yes           | No            |
| `vuln_source`        | Source vulnerability report    | No            | No            |
| `vuln_container`     | Container vulnerability report | No            | No            |
| `image_digests`      | Container image digest info    | No\*          | No            |
| `required_checks`    | CI checks snapshot             | Yes           | Yes           |
| `promotion_commands` | RC promotion script            | No            | Yes           |
| `metadata`           | Additional metadata files      | No            | No            |

\*Required when container images are part of the release

---

## Deterministic Generation

The bundle SBOM must be generated deterministically:

1. **Stable Ordering**: Components sorted by role, then by path
2. **No Timestamps**: The `metadata.timestamp` field is omitted (timestamps are in provenance.json)
3. **Stable Serial Number**: URN based on tag + commit prefix
4. **Consistent Hashing**: SHA-256 computed with consistent algorithm

### Serial Number Format

```
urn:uuid:summit-bundle-<tag>-<commit-prefix-8>
```

Example: `urn:uuid:summit-bundle-v4.1.2-a8b19638`

---

## Generation

### Using the Generator Script

```bash
./scripts/release/generate_bundle_sbom.sh \
  --bundle artifacts/release/v4.1.2 \
  --tag v4.1.2 \
  --sha a8b19638b58452371e7749f714e2b9bea9f482ad
```

### Output

The script generates:

- `artifacts/release/v4.1.2/sbom/bundle.cdx.json`

### Integration with Provenance

After generating the bundle SBOM, regenerate provenance to include it:

```bash
./scripts/release/generate_provenance_manifest.sh \
  --bundle-dir artifacts/release/v4.1.2 \
  --tag v4.1.2 \
  --sha a8b1963
```

The provenance.json will include:

```json
{
  "bundle_sbom": {
    "path": "sbom/bundle.cdx.json",
    "format": "CycloneDX 1.5",
    "sha256": "..."
  }
}
```

---

## Verification

### Check Bundle SBOM Exists

```bash
test -f artifacts/release/v4.1.2/sbom/bundle.cdx.json && echo "Bundle SBOM exists"
```

### Validate JSON Structure

```bash
jq empty artifacts/release/v4.1.2/sbom/bundle.cdx.json && echo "Valid JSON"
```

### Verify Against SHA256SUMS

```bash
cd artifacts/release/v4.1.2
sha256sum -c SHA256SUMS --ignore-missing | grep "bundle.cdx.json"
```

### Check Component Count

```bash
jq '.components | length' artifacts/release/v4.1.2/sbom/bundle.cdx.json
```

### List All Components with Roles

```bash
jq -r '.components[] | "\(.properties[] | select(.name == "bundle:role") | .value)\t\(.name)"' \
  artifacts/release/v4.1.2/sbom/bundle.cdx.json
```

---

## Example Bundle SBOM

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:summit-bundle-v4.1.2-a8b19638",
  "version": 1,
  "metadata": {
    "component": {
      "type": "application",
      "bom-ref": "summit-release-bundle",
      "name": "summit-release-bundle",
      "version": "v4.1.2",
      "description": "Summit Platform GA Release Bundle",
      "purl": "pkg:generic/summit-release-bundle@v4.1.2"
    },
    "properties": [
      { "name": "bundle:tag", "value": "v4.1.2" },
      { "name": "bundle:commit", "value": "a8b19638b58452371e7749f714e2b9bea9f482ad" },
      { "name": "bundle:kind", "value": "ga" },
      { "name": "bundle:format_version", "value": "1.0" }
    ]
  },
  "components": [
    {
      "type": "file",
      "bom-ref": "file:provenance.json",
      "name": "provenance.json",
      "description": "Master provenance manifest with SBOM references",
      "hashes": [{ "alg": "SHA-256", "content": "abc123..." }],
      "properties": [
        { "name": "bundle:role", "value": "provenance" },
        { "name": "bundle:required", "value": "true" }
      ]
    },
    {
      "type": "file",
      "bom-ref": "file:SHA256SUMS",
      "name": "SHA256SUMS",
      "description": "Checksums for bundle integrity verification",
      "hashes": [{ "alg": "SHA-256", "content": "def456..." }],
      "properties": [
        { "name": "bundle:role", "value": "hashes" },
        { "name": "bundle:required", "value": "true" }
      ]
    },
    {
      "type": "file",
      "bom-ref": "file:sbom/source.cdx.json",
      "name": "sbom/source.cdx.json",
      "description": "CycloneDX source code SBOM",
      "hashes": [{ "alg": "SHA-256", "content": "ghi789..." }],
      "properties": [
        { "name": "bundle:role", "value": "sbom_source" },
        { "name": "bundle:required", "value": "true" }
      ]
    }
  ],
  "externalReferences": [
    {
      "type": "bom",
      "url": "sbom/source.cdx.json",
      "comment": "Source code dependencies SBOM"
    },
    {
      "type": "bom",
      "url": "sbom/container.cdx.json",
      "comment": "Container image SBOM"
    }
  ]
}
```

---

## What's Included vs Excluded

### Included

- All files listed in bundle_index.json
- File paths, sizes, and SHA-256 hashes
- Role classification for each file
- Required/optional status

### Excluded

- Actual file contents (only hashes)
- Mutable timestamps (generation time is in provenance.json)
- Sensitive data (no secrets, credentials, or PII)
- Transient files (temp files, logs)

---

## Tooling Compatibility

The bundle SBOM is compatible with:

| Tool                       | Support       |
| -------------------------- | ------------- |
| OWASP Dependency-Track     | Full          |
| Anchore/Syft               | Full          |
| Grype (vulnerability scan) | N/A (no deps) |
| CycloneDX CLI              | Full          |
| SPDX converters            | Convertible   |

### Viewing with CycloneDX CLI

```bash
# Install CycloneDX CLI
npm install -g @cyclonedx/cyclonedx-cli

# View summary
cyclonedx-cli analyze sbom/bundle.cdx.json
```

---

## Relationship to Other Artifacts

```
┌─────────────────────────────────────────────────────────────┐
│                    GA Release Bundle                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  provenance.json ─────────► References all artifacts        │
│       │                                                     │
│       ├──► sbom/bundle.cdx.json  ◄── This document          │
│       │         │                                           │
│       │         └──► Lists all bundle files + hashes        │
│       │                                                     │
│       ├──► sbom/source.cdx.json  ◄── Source code deps       │
│       │                                                     │
│       └──► sbom/container.cdx.json  ◄── Container deps      │
│                                                             │
│  SHA256SUMS ─────────────► Verifies all files               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## References

- [CycloneDX 1.5 Specification](https://cyclonedx.org/docs/1.5/json/)
- [SBOM Unification](SBOM_UNIFICATION.md)
- [Bundle Index Schema](BUNDLE_INDEX_SCHEMA.md)
- [Required Checks Policy](../ci/REQUIRED_CHECKS_POLICY.json)

---

## Change Log

| Date       | Change                        | Author               |
| ---------- | ----------------------------- | -------------------- |
| 2026-01-08 | Initial Bundle SBOM for MVP-4 | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
