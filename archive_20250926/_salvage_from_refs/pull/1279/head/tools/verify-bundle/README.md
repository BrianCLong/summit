# Verify-Bundle CLI Tool

Round-trip proof verification for IntelGraph deployment bundles, ensuring integrity and authenticity through cryptographic verification and policy compliance.

## Features

- **Manifest Validation**: Verify bundle structure and metadata
- **Checksum Verification**: SHA-256 integrity checks for all components
- **Signature Verification**: Cryptographic signature validation using cosign
- **SLSA Provenance**: Supply chain security compliance verification
- **Policy Compliance**: Trust policy enforcement and validation
- **Multiple Output Formats**: Text, JSON, and Markdown reports

## Installation

```bash
cd tools/verify-bundle
npm install
npm run build
```

## Usage

### Verify a Bundle

```bash
# Basic verification
./dist/cli.js verify /path/to/bundle

# Verbose output
./dist/cli.js verify /path/to/bundle --verbose

# JSON output
./dist/cli.js verify /path/to/bundle --format json

# Save report to file
./dist/cli.js verify /path/to/bundle --output verification-report.md --format markdown

# Use custom trust policy
./dist/cli.js verify /path/to/bundle --policy /path/to/trust-policy.yaml
```

### Validate Trust Policy

```bash
./dist/cli.js check-policy security/policy/trust-policy.yaml
```

## Bundle Structure

A valid deployment bundle must contain:

```
bundle/
├── bundle-manifest.json      # Bundle metadata and component list
├── signatures/
│   ├── manifest.sig         # Manifest signature
│   └── component-*.sig      # Component signatures
├── components/
│   ├── api-server.tar.gz    # Application components
│   ├── web-app.tar.gz
│   └── gateway.tar.gz
└── provenance/
    └── slsa-provenance.json  # SLSA provenance attestation
```

## Manifest Format

```json
{
  "version": "2.1.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "components": [
    {
      "name": "api-server",
      "version": "2.1.0",
      "path": "components/api-server.tar.gz",
      "checksum": "sha256:abc123...",
      "size": 12345678,
      "dependencies": ["postgres", "redis"]
    }
  ],
  "checksums": {
    "manifest": "sha256:def456...",
    "bundle": "sha256:ghi789..."
  },
  "signatures": {
    "manifest": "cosign-signature",
    "bundle": "gpg-signature"
  },
  "provenance": {
    "builder": {
      "id": "github-actions",
      "version": "v1.0.0"
    },
    "build_type": "release",
    "invocation": {
      "config_source": "github.com/BrianCLong/intelgraph/.github/workflows/release.yml",
      "parameters": {
        "environment": "production",
        "release_tag": "v2.1.0"
      }
    },
    "materials": [
      {
        "uri": "git+https://github.com/BrianCLong/intelgraph@v2.1.0",
        "digest": {
          "sha1": "commit-sha"
        }
      }
    ],
    "metadata": {
      "build_started_on": "2024-01-15T10:00:00Z",
      "build_finished_on": "2024-01-15T10:25:00Z",
      "completeness": {
        "parameters": true,
        "environment": true,
        "materials": true
      }
    }
  },
  "metadata": {
    "release_tag": "v2.1.0",
    "commit_sha": "abc123def456",
    "build_id": "github-actions-12345",
    "environment": "production"
  }
}
```

## Trust Policy

Define verification requirements in `trust-policy.yaml`:

```yaml
version_constraints:
  allowed_pattern: "^\\d+\\.\\d+\\.\\d+$"
  minimum_version: "2.0.0"

environment_constraints:
  allowed: ["production", "staging"]
  blocked: ["development", "test"]

component_constraints:
  required: ["api-server", "web-app"]
  blocked: ["debug-tools", "test-utils"]

provenance_constraints:
  trusted_builders:
    - "github-actions"
    - "slsa-framework/slsa-github-generator"
  required_materials:
    - "github.com/BrianCLong/intelgraph"

signature_constraints:
  require_cosign: true
  trusted_signers:
    - "security@intelgraph.io"
```

## Verification Process

1. **Manifest Validation**
   - Check required fields and structure
   - Validate version format
   - Verify component definitions

2. **Checksum Verification**
   - Calculate SHA-256 for each component
   - Compare against manifest checksums
   - Verify file sizes

3. **Signature Verification**
   - Validate manifest signature with cosign
   - Check component signatures
   - Verify signer identity

4. **Provenance Verification**
   - Validate SLSA provenance format
   - Check builder identity and trust
   - Verify source materials

5. **Policy Compliance**
   - Check version constraints
   - Validate environment rules
   - Enforce component requirements

## Exit Codes

- `0`: Verification successful
- `1`: Verification failed or error occurred

## Examples

### Successful Verification

```bash
$ ./dist/cli.js verify bundles/intelgraph-v2.1.0

============================================================
Bundle Verification Report
============================================================

Status: ✅ PASS
Bundle: bundles/intelgraph-v2.1.0
Timestamp: 2024-01-15T15:30:00.000Z

Verification Checks:
  Manifest Valid:    ✅
  Checksums Valid:   ✅
  Signatures Valid:  ✅
  Provenance Valid:  ✅
  Policy Compliant:  ✅

Details:
  Components Verified: 3/3
  Build Time: 2024-01-15T10:25:00Z
  Provenance Builder: github-actions
```

### Failed Verification

```bash
$ ./dist/cli.js verify bundles/suspicious-bundle

============================================================
Bundle Verification Report
============================================================

Status: ❌ FAIL
Bundle: bundles/suspicious-bundle
Timestamp: 2024-01-15T15:30:00.000Z

Verification Checks:
  Manifest Valid:    ✅
  Checksums Valid:   ❌
  Signatures Valid:  ❌
  Provenance Valid:  ❌
  Policy Compliant:  ❌

Details:
  Components Verified: 1/3
  Build Time: 2024-01-15T09:00:00Z
  Provenance Builder: unknown-builder

Errors:
  ❌ Checksum mismatch for web-app: expected abc123, got def456
  ❌ Manifest signature verification failed
  ❌ Untrusted builder: unknown-builder
  ❌ Environment development not in allowed list

Warnings:
  ⚠️ Size mismatch for api-server: expected 1234567, got 1234560
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev verify /path/to/bundle

# Run tests
npm test

# Type check
npm run typecheck

# Lint code
npm run lint
```

## Security Considerations

- Always verify bundles from untrusted sources
- Keep trust policies up to date
- Regularly rotate signing keys
- Monitor verification logs for anomalies
- Use hardware security modules for critical signatures

## Integration

The verify-bundle tool integrates with:

- **CI/CD Pipelines**: Automated verification in deployment workflows
- **Release Processes**: Mandatory verification before production deployment
- **Monitoring**: Verification metrics and alerting
- **Audit Trails**: Comprehensive verification logging