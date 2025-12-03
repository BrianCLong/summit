# SBOM & Vulnerability Automation

> **Version**: 2.0.0
> **Last Updated**: 2025-01-15
> **Status**: Production Ready

## Overview

This document describes the automated SBOM (Software Bill of Materials) generation, vulnerability scanning, SLSA Level 3 attestation, and auto-remediation capabilities implemented for the IntelGraph platform.

## Table of Contents

1. [Architecture](#architecture)
2. [SBOM Generation](#sbom-generation)
3. [Vulnerability Scanning](#vulnerability-scanning)
4. [SLSA Level 3 Attestations](#slsa-level-3-attestations)
5. [Auto-Fix Automation](#auto-fix-automation)
6. [Air-Gapped Operations](#air-gapped-operations)
7. [Dashboard](#vulnerability-dashboard)
8. [Configuration](#configuration)
9. [CI/CD Integration](#cicd-integration)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Automation Pipeline                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │   Syft   │───▶│  Trivy   │───▶│  SLSA    │───▶│ Auto-Fix │  │
│  │  (SBOM)  │    │  (Scan)  │    │ Attestor │    │  Engine  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │               │               │               │         │
│       ▼               ▼               ▼               ▼         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Air-Gapped Vulnerability Manager             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │  │
│  │  │ VulnDB  │  │  SBOM   │  │  Scan   │  │ Policy  │     │  │
│  │  │ Store   │  │  Store  │  │ History │  │ Engine  │     │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Vulnerability Dashboard (React)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## SBOM Generation

### Overview

SBOMs are generated using [Syft](https://github.com/anchore/syft) and optionally signed with [Cosign](https://github.com/sigstore/cosign).

### Supported Formats

- **CycloneDX JSON** (default) - Industry standard, recommended
- **SPDX JSON** - Linux Foundation standard
- **Syft JSON** - Native Syft format

### Usage

#### CLI Usage

```bash
# Generate SBOM for current directory
npx ts-node .github/scanners/index.ts generate-sbom .

# Generate and sign SBOM
npx ts-node .github/scanners/index.ts generate-sbom . --sign

# Generate SBOM for container image
npx ts-node .github/scanners/index.ts generate-sbom ghcr.io/org/image:tag
```

#### Programmatic Usage

```typescript
import { createSBOMGenerator } from '.github/scanners';

const generator = createSBOMGenerator();

const result = await generator.generateSBOM({
  target: '.',
  outputPath: 'sbom.cdx.json',
  format: 'cyclonedx-json',
  signWithCosign: true,
});

console.log(`Generated SBOM with ${result.componentCount} components`);
```

### CI Integration

The `sbom-vuln-scan.yml` workflow automatically:
1. Generates SBOM on every push to `main`
2. Signs SBOM with keyless Cosign
3. Uploads to GitHub Dependency Graph
4. Stores as workflow artifact

---

## Vulnerability Scanning

### Overview

Vulnerability scanning is powered by [Trivy](https://github.com/aquasecurity/trivy) with policy-based enforcement.

### Scan Types

| Type | Description | Use Case |
|------|-------------|----------|
| `filesystem` | Scans local files and dependencies | Development, CI |
| `image` | Scans container images | Pre-deployment |
| `sbom` | Scans existing SBOM files | Post-generation |
| `repository` | Scans git repositories | Remote analysis |

### Policy Configuration

Policies are defined per-service in `.github/scanners/config.ts`:

```typescript
const policy = {
  services: {
    'intelgraph-server': {
      exposure: 'internet-facing',
      severityThresholds: {
        critical: 'block',
        high: 'block',
        medium: 'block',
        low: 'warn',
      },
      allowedVulnerabilities: ['CVE-2024-WAIVED'],
      scanSchedule: 'on_push',
    },
  },
};
```

### Severity Actions

| Action | Description |
|--------|-------------|
| `block` | Fails CI pipeline, blocks deployment |
| `warn` | Logs warning, allows pipeline to continue |
| `ignore` | No action taken |

### Usage

```typescript
import { createTrivyScanner } from '.github/scanners';

const scanner = createTrivyScanner();

const result = await scanner.scan({
  target: '.',
  severity: ['critical', 'high'],
  scanners: ['vuln', 'secret'],
});

if (!result.policyResult?.allowed) {
  console.error('Policy violations:', result.policyResult?.blockedVulnerabilities);
  process.exit(1);
}
```

---

## SLSA Level 3 Attestations

### Overview

SLSA (Supply-chain Levels for Software Artifacts) Level 3 attestations provide cryptographic proof of build provenance.

### SLSA-3 Requirements Met

| Requirement | Implementation |
|-------------|----------------|
| ✅ Build from version-controlled source | GitHub repository |
| ✅ Scripted build | GitHub Actions workflow |
| ✅ Build service integrity | GitHub-hosted runners |
| ✅ Non-falsifiable provenance | Cosign keyless signing |
| ✅ Isolated build environment | Ephemeral runners |

### Provenance Format

Provenance follows the [SLSA v1.0 specification](https://slsa.dev/provenance/v1):

```json
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "predicateType": "https://slsa.dev/provenance/v1",
  "subject": [{
    "name": "artifact.tar.gz",
    "digest": { "sha256": "abc123..." }
  }],
  "predicate": {
    "buildDefinition": {
      "buildType": "https://github.com/slsa-framework/slsa-github-generator/generic@v1",
      "externalParameters": { ... },
      "resolvedDependencies": [{ "uri": "git+https://...", "digest": { ... } }]
    },
    "runDetails": {
      "builder": { "id": "https://github.com/..." },
      "metadata": { "invocationId": "...", "startedOn": "...", "finishedOn": "..." }
    }
  }
}
```

### Verification

```typescript
import { createSLSA3Attestor } from '.github/scanners';

const attestor = createSLSA3Attestor();

const result = await attestor.verifyProvenance({
  bundlePath: 'provenance.json',
  artifactPath: 'artifact.tar.gz',
  trustedBuilders: [
    'https://github.com/slsa-framework/slsa-github-generator/...',
  ],
});

console.log(`SLSA Level: ${result.level}`); // SLSA_3
console.log(`Valid: ${result.valid}`);
```

---

## Auto-Fix Automation

### Overview

The auto-fix system automatically creates pull requests to remediate fixable vulnerabilities.

### Confidence Levels

| Level | Criteria | Risk |
|-------|----------|------|
| **High** | Patch version bump (1.0.0 → 1.0.1) | Low |
| **Medium** | Minor version bump (1.0.0 → 1.1.0) | Medium |
| **Low** | Major version bump (1.0.0 → 2.0.0) | High (breaking) |

### Configuration

```typescript
const result = await autoFixer.applyFixes({
  scanResult,
  dryRun: false,           // Actually apply changes
  createPR: true,          // Create pull request
  maxFixes: 10,            // Limit number of fixes
  minConfidence: 'medium', // Skip low-confidence fixes
  excludeBreakingChanges: true, // Skip major version bumps
});
```

### Workflow

The `auto-fix-vulnerabilities.yml` workflow:
1. Runs weekly (Monday 9 AM UTC)
2. Scans for fixable vulnerabilities
3. Applies safe fixes (patch/minor versions)
4. Creates PR with summary
5. Labels PR as `security` and `automated`

---

## Air-Gapped Operations

### Overview

For air-gapped or disconnected environments, the system supports offline operation.

### Setup

1. **Download vulnerability database**:
   ```bash
   trivy image --download-db-only
   cp -r ~/.cache/trivy/db /secure-storage/trivy-db
   ```

2. **Configure environment**:
   ```bash
   export AIRGAP_MODE=true
   export VULN_DB_PATH=/secure-storage/trivy-db
   export SBOM_STORE_PATH=/secure-storage/sbom
   export OFFLINE_MODE=true
   ```

3. **Run scans**:
   ```typescript
   const scanner = createTrivyScanner(
     undefined,
     { enabled: true, offlineMode: true }
   );

   await scanner.scanAirGapped({ target: '.' });
   ```

### Database Updates

For air-gapped environments, periodically sync the vulnerability database:

```bash
# On connected system
trivy image --download-db-only
tar -czf trivy-db-$(date +%Y%m%d).tar.gz ~/.cache/trivy/db

# Transfer to air-gapped system
# On air-gapped system
tar -xzf trivy-db-*.tar.gz -C /secure-storage/
```

---

## Vulnerability Dashboard

### Overview

The React-based dashboard provides real-time visibility into security posture.

### Features

- **Summary Statistics**: Critical/High/Medium/Low counts
- **Policy Pass Rate**: Compliance percentage
- **SBOM Inventory**: All generated SBOMs
- **Scan History**: Recent scan results
- **Trend Analysis**: 30-day vulnerability trends
- **Search**: Find vulnerabilities by package
- **Export**: Generate compliance reports

### Access

Navigate to: `/security/vulnerabilities`

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/dashboard` | GET | Dashboard summary |
| `/api/security/vulnerabilities` | GET | Search vulnerabilities |
| `/api/security/sboms` | GET/POST | SBOM management |
| `/api/security/scans` | GET/POST | Scan history |
| `/api/security/compliance-report` | GET | Generate report |

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AIRGAP_MODE` | Enable air-gapped mode | `false` |
| `VULN_DB_PATH` | Path to Trivy database | `/var/lib/trivy/db` |
| `SBOM_STORE_PATH` | SBOM storage location | `/var/lib/sbom` |
| `COSIGN_KEY_PATH` | Path to signing key | (keyless) |
| `SLSA3_ENABLED` | Enable SLSA verification | `true` |
| `EMERGENCY_BYPASS` | Allow policy bypass | `false` |

### Scanner Configuration

Edit `.github/scanners/config.ts`:

```typescript
export const DEFAULT_SCANNER_CONFIG = {
  syft: {
    outputFormat: 'cyclonedx-json',
    scope: 'all-layers',
  },
  trivy: {
    severity: ['critical', 'high', 'medium'],
    ignoreUnfixed: false,
    timeout: '15m',
    scanners: ['vuln', 'secret'],
  },
  cosign: {
    keylessEnabled: true,
  },
  slsa: {
    requireHermetic: true,
    maxProvenanceAge: 30 * 24 * 60 * 60, // 30 days
  },
};
```

---

## CI/CD Integration

### Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `sbom-vuln-scan.yml` | Push, PR, Daily | SBOM + Vuln scan |
| `slsa-attestation.yml` | Release | SLSA-3 attestation |
| `auto-fix-vulnerabilities.yml` | Weekly, Manual | Auto-remediation |

### Required Secrets

- `GITHUB_TOKEN` (automatic)
- `COSIGN_PRIVATE_KEY` (optional, for key-based signing)

### Branch Protection

Recommended settings:
- ✅ Require `policy-gate` to pass
- ✅ Require signed commits
- ✅ Require linear history

---

## Troubleshooting

### Common Issues

#### Syft fails to generate SBOM

```
Error: failed to catalog
```

**Solution**: Ensure target path exists and is accessible.

#### Trivy database outdated

```
Error: database not found
```

**Solution**: Run `trivy image --download-db-only` or update offline database.

#### Cosign signing fails

```
Error: getting signer: no key provided
```

**Solution**: Either set `COSIGN_PRIVATE_KEY` or ensure OIDC is configured for keyless signing.

#### Policy violations blocking merge

**Solution**: Either:
1. Fix the vulnerabilities
2. Add to waiver list (requires security approval)
3. Use `EMERGENCY_BYPASS=true` (emergencies only)

### Debug Mode

Enable verbose logging:

```bash
export DEBUG=scanners:*
export TRIVY_DEBUG=true
```

### Support

- Slack: `#security-alerts`
- GitHub Issues: `labels:security`
- Security Team: security@intelgraph.io

---

## References

- [SLSA Framework](https://slsa.dev/)
- [CycloneDX Specification](https://cyclonedx.org/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Cosign Documentation](https://docs.sigstore.dev/cosign/)
- [In-toto Attestation Format](https://github.com/in-toto/attestation)
