# SBOM Unification for GA Releases

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The SBOM Unification system ensures that every GA Release Bundle is **self-contained** and **verifiable offline**. When a GA tag `vX.Y.Z` is cut, the release bundle contains:

- Source code SBOM (CycloneDX format)
- Container image SBOM (CycloneDX format)
- Vulnerability summaries
- Provenance manifest with explicit linkage to all artifacts

This allows operators to verify the entire release without querying CI logs or external services.

---

## Canonical File Layout

All SBOM and vulnerability artifacts are stored in a standardized structure:

```
artifacts/release/<tag>/
├── provenance.json              # Master provenance manifest
├── SHA256SUMS                   # Checksums for all files
├── SBOM_MANIFEST.json           # SBOM collection metadata
│
├── sbom/
│   ├── source.cdx.json          # CycloneDX source SBOM
│   └── container.cdx.json       # CycloneDX container SBOM
│
└── vuln/
    ├── source-summary.json      # Source vulnerability summary
    └── container-summary.json   # Container vulnerability summary
```

### File Descriptions

| File                          | Format        | Description                                                      |
| ----------------------------- | ------------- | ---------------------------------------------------------------- |
| `provenance.json`             | JSON          | Master manifest with hashes, build metadata, and SBOM references |
| `SHA256SUMS`                  | Text          | SHA-256 checksums for all files in the bundle                    |
| `SBOM_MANIFEST.json`          | JSON          | SBOM collection metadata from `collect_sbom_artifacts.sh`        |
| `sbom/source.cdx.json`        | CycloneDX 1.4 | Source code dependencies SBOM                                    |
| `sbom/container.cdx.json`     | CycloneDX 1.4 | Container image SBOM                                             |
| `vuln/source-summary.json`    | JSON          | Source vulnerability scan results                                |
| `vuln/container-summary.json` | JSON          | Container vulnerability scan results                             |

---

## SBOM Generation

### Source SBOM

The source SBOM is generated using [Syft](https://github.com/anchore/syft) against the repository source code:

```bash
syft packages dir:. -o cyclonedx-json --file sbom/source.cdx.json
```

This captures:

- Node.js dependencies (from package.json/pnpm-lock.yaml)
- Python dependencies (from requirements.txt if present)
- Any other detected package managers

### Container SBOM

The container SBOM is generated for the built Docker image:

```bash
syft packages docker:<image>@<digest> -o cyclonedx-json --file sbom/container.cdx.json
```

This captures:

- Base image layers
- Installed packages (apt, apk, etc.)
- Application dependencies bundled into the image

---

## Vulnerability Scanning

### Source Vulnerabilities

Scanned using [Grype](https://github.com/anchore/grype):

```bash
grype dir:. -o json --file vuln/source-summary.json
```

### Container Vulnerabilities

```bash
grype docker:<image>@<digest> -o json --file vuln/container-summary.json
```

---

## Scripts

### collect_sbom_artifacts.sh

Collects and normalizes SBOM/vulnerability artifacts for the GA Release Bundle.

**Usage:**

```bash
./scripts/release/collect_sbom_artifacts.sh \
  --tag v4.1.2 \
  --sha a8b1963 \
  --out artifacts/release/v4.1.2
```

**Options:**

- `--tag TAG` - Release tag (e.g., v4.1.2)
- `--sha SHA` - Commit SHA
- `--out DIR` - Output directory
- `--allow-missing-container` - Allow missing container SBOM (for non-container releases)
- `--generate-local` - Force local generation (skip CI artifact download)

**Behavior:**

1. Attempts to download existing SBOM artifacts from CI (supply-chain-integrity workflow)
2. Falls back to local generation with Syft/Grype if CI artifacts unavailable
3. Normalizes filenames to canonical structure
4. Generates SBOM_MANIFEST.json with metadata

### generate_provenance_manifest.sh

Generates the provenance.json manifest with SBOM references.

**Usage:**

```bash
./scripts/release/generate_provenance_manifest.sh \
  --tag v4.1.2 \
  --sha a8b1963 \
  --bundle-dir artifacts/release/v4.1.2
```

**Options:**

- `--tag TAG` - Release tag
- `--sha SHA` - Commit SHA
- `--bundle-dir DIR` - Path to the release bundle
- `--image-digest DIGEST` - Container image digest (optional)
- `--workflow-run ID` - CI workflow run ID (optional)

---

## Provenance Manifest Structure

The `provenance.json` file provides cryptographic linkage:

```json
{
  "_type": "https://summit.dev/provenance/v1",
  "version": "1.0.0",
  "generator": {
    "tool": "generate_provenance_manifest.sh",
    "version": "1.0.0"
  },
  "build": {
    "tag": "v4.1.2",
    "version": "4.1.2",
    "commit": "a8b1963...",
    "timestamp": "2026-01-08T12:00:00Z",
    "workflow_run": "12345678"
  },
  "sbom": {
    "source": {
      "path": "sbom/source.cdx.json",
      "format": "CycloneDX 1.4",
      "exists": true,
      "sha256": "abc123...",
      "size_bytes": 12345
    },
    "container": {
      "path": "sbom/container.cdx.json",
      "format": "CycloneDX 1.4",
      "exists": true,
      "sha256": "def456...",
      "size_bytes": 67890,
      "image_digest": "sha256:..."
    }
  },
  "vulnerability_summaries": {
    "source": {
      "path": "vuln/source-summary.json",
      "exists": true,
      "sha256": "ghi789..."
    },
    "container": {
      "path": "vuln/container-summary.json",
      "exists": true,
      "sha256": "jkl012..."
    }
  },
  "verification": {
    "checksum_file": "SHA256SUMS",
    "instructions": "Verify with: sha256sum -c SHA256SUMS"
  }
}
```

---

## Offline Verification

### Step 1: Verify Bundle Integrity

```bash
cd artifacts/release/v4.1.2/
sha256sum -c SHA256SUMS
```

### Step 2: Examine Source SBOM

```bash
# View component summary
jq '.components | length' sbom/source.cdx.json

# List all dependencies
jq '.components[] | .name + "@" + .version' sbom/source.cdx.json
```

### Step 3: Examine Container SBOM

```bash
# View container SBOM metadata
jq '.metadata' sbom/container.cdx.json

# List OS packages
jq '.components[] | select(.type == "library") | .name' sbom/container.cdx.json
```

### Step 4: Review Vulnerability Summaries

```bash
# Source vulnerabilities
jq '.matches | length' vuln/source-summary.json
jq '.matches[] | select(.vulnerability.severity == "Critical")' vuln/source-summary.json

# Container vulnerabilities
jq '.matches | length' vuln/container-summary.json
```

### Step 5: Verify Provenance Linkage

```bash
# Check that provenance.json references correct hashes
SBOM_HASH=$(sha256sum sbom/source.cdx.json | cut -d' ' -f1)
PROV_HASH=$(jq -r '.sbom.source.sha256' provenance.json)

if [ "$SBOM_HASH" == "$PROV_HASH" ]; then
  echo "✅ Source SBOM hash matches provenance"
else
  echo "❌ Source SBOM hash mismatch!"
fi
```

---

## Local SBOM Regeneration

If you need to regenerate SBOMs locally:

### Prerequisites

```bash
# Install Syft
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Install Grype
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
```

### Generate Source SBOM

```bash
syft packages dir:. -o cyclonedx-json --file sbom-source-local.cdx.json
```

### Generate from Existing Image

```bash
# Pull and scan the exact image by digest
docker pull ghcr.io/owner/summit:v4.1.2
syft packages docker:ghcr.io/owner/summit:v4.1.2 -o cyclonedx-json --file sbom-container-local.cdx.json
```

---

## Policy Exceptions

### When Container SBOM is Not Available

For releases that don't include container images (e.g., library-only releases), the container SBOM may be absent. In this case:

1. Run collect with `--allow-missing-container`:

   ```bash
   ./scripts/release/collect_sbom_artifacts.sh --tag v4.1.2 --sha abc123 --out ./bundle --allow-missing-container
   ```

2. The provenance.json will indicate `"exists": false` for container SBOM

3. Document the exception in the release notes

---

## CI Integration

The SBOM collection is integrated into the GA release workflow:

1. **supply-chain-integrity.yml**: Generates SBOMs during build, uploads as artifacts
2. **release-ga.yml**: Downloads SBOM artifacts, runs collect_sbom_artifacts.sh
3. **collect_sbom_artifacts.sh**: Normalizes to canonical layout
4. **generate_provenance_manifest.sh**: Creates provenance.json with SBOM references

### Workflow Sequence

```
[push v4.1.2 tag]
       │
       ▼
[supply-chain-integrity.yml]
  ├─ Generate source SBOM → artifact: sboms-source-4.1.2
  ├─ Build container image
  ├─ Generate container SBOM → artifact: sboms-container-4.1.2
  └─ Scan vulnerabilities → artifacts: vulnerability-reports-*
       │
       ▼
[release-ga.yml]
  ├─ Download SBOM artifacts
  ├─ Run collect_sbom_artifacts.sh
  ├─ Run generate_provenance_manifest.sh
  └─ Upload GA Release Bundle
```

---

## Troubleshooting

### SBOM Artifact Not Found

**Symptom:** `collect_sbom_artifacts.sh` fails to download CI artifacts

**Diagnosis:**

```bash
# Check if supply-chain-integrity ran for the commit
gh run list --commit <sha> --workflow supply-chain-integrity.yml
```

**Resolution:**

1. Ensure supply-chain-integrity workflow ran successfully
2. Use `--generate-local` to generate SBOM locally

### Container SBOM Missing Dependencies

**Symptom:** Container SBOM has fewer dependencies than expected

**Diagnosis:**

- Check if the image was built correctly
- Verify the Syft scan target

**Resolution:**

```bash
# Scan with verbose output
syft packages docker:<image>@<digest> -v -o cyclonedx-json
```

### SHA256SUMS Verification Fails

**Symptom:** `sha256sum -c SHA256SUMS` reports mismatches

**Diagnosis:**

- File was modified after bundle creation
- Bundle was corrupted during transfer

**Resolution:**

1. Re-download the bundle
2. If persistent, report to Platform Engineering

---

## References

- [CycloneDX Specification](https://cyclonedx.org/specification/overview/)
- [Syft Documentation](https://github.com/anchore/syft)
- [Grype Documentation](https://github.com/anchore/grype)
- [Required Checks Policy](../ci/REQUIRED_CHECKS_POLICY.json)
- [Promotion Guard](MVP-4_STABILIZATION_PROMOTION.md)

---

## Change Log

| Date       | Change                             | Author               |
| ---------- | ---------------------------------- | -------------------- |
| 2026-01-08 | Initial SBOM Unification for MVP-4 | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
