# IntelGraph SBOM Process

## Overview

This document describes the Software Bill of Materials (SBOM) generation, management, and verification process for the IntelGraph platform, ensuring supply chain transparency and security.

## SBOM Standards and Formats

### Supported Formats

1. **SPDX (Software Package Data Exchange)**
   - Industry standard for SBOM data exchange
   - JSON format for machine readability
   - Used for compliance and automation

2. **CycloneDX**
   - OWASP standard for dependency analysis
   - Supports vulnerability correlation
   - Rich metadata for security analysis

### SBOM Generation Tools

#### Primary: Syft

```bash
# Generate SPDX format SBOM
syft packages docker:ghcr.io/brianclong/intelgraph/web:latest -o spdx-json

# Generate CycloneDX format SBOM
syft packages docker:ghcr.io/brianclong/intelgraph/web:latest -o cyclonedx-json
```

#### Secondary: Docker Scout

```bash
# Generate SBOM for container image
docker scout sbom ghcr.io/brianclong/intelgraph/web:latest
```

## SBOM Generation Pipeline

### CI/CD Integration

```yaml
# .github/workflows/build-images.yml excerpt
- name: Generate SBOM with Syft
  run: |
    syft ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.component.name }}:latest \
      -o spdx-json=sbom-${{ matrix.component.name }}.spdx.json
    syft ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.component.name }}:latest \
      -o cyclonedx-json=sbom-${{ matrix.component.name }}.cyclonedx.json

- name: Upload SBOM artifacts
  uses: actions/upload-artifact@v4
  with:
    name: sbom-${{ matrix.component.name }}
    path: |
      sbom-${{ matrix.component.name }}.spdx.json
      sbom-${{ matrix.component.name }}.cyclonedx.json
```

### Generated Components

For each container image:

- **web**: Frontend React application
- **server**: Backend API server
- **gateway**: API gateway service

## SBOM Content Standards

### Required Information

1. **Component Identification**

   ```json
   {
     "name": "express",
     "version": "4.18.2",
     "purl": "pkg:npm/express@4.18.2",
     "supplier": "TJ Holowaychuk <tj@vision-media.ca>",
     "downloadLocation": "https://registry.npmjs.org/express/-/express-4.18.2.tgz"
   }
   ```

2. **License Information**

   ```json
   {
     "licenseConcluded": "MIT",
     "licenseInfoFromFiles": ["MIT"],
     "copyrightText": "Copyright (c) 2009-2014 TJ Holowaychuk <tj@vision-media.ca>"
   }
   ```

3. **Security Metadata**
   ```json
   {
     "vulnerabilities": [
       {
         "id": "CVE-2022-24999",
         "severity": "HIGH",
         "description": "Prototype pollution vulnerability"
       }
     ]
   }
   ```

### IntelGraph-Specific Metadata

```json
{
  "creationInfo": {
    "created": "2025-09-20T08:00:00Z",
    "creators": ["Tool: syft", "Organization: IntelGraph"],
    "licenseListVersion": "3.21"
  },
  "documentNamespace": "https://intelgraph.com/sbom/2025-09-20/web",
  "name": "IntelGraph Web Application",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "documentDescribes": ["SPDXRef-RootPackage"]
}
```

## SBOM Verification Process

### Automated Verification

1. **Format Validation**

   ```bash
   # Validate SPDX format
   spdx-tools validate sbom-web.spdx.json

   # Validate CycloneDX format
   cyclonedx-cli validate --input-file sbom-web.cyclonedx.json
   ```

2. **Content Verification**

   ```bash
   # Verify package inventory matches container
   ./scripts/verify-sbom-completeness.sh sbom-web.spdx.json web:latest

   # Check for known vulnerabilities
   grype sbom:sbom-web.spdx.json
   ```

3. **Signature Verification**
   ```bash
   # Verify SBOM attestation signature
   cosign verify-attestation --type spdx \
     --certificate-identity-regexp ".*" \
     --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
     ghcr.io/brianclong/intelgraph/web:latest
   ```

### Manual Review Process

#### Weekly SBOM Review

1. **New Dependencies**
   - Review newly added packages
   - Verify license compatibility
   - Assess security implications

2. **Vulnerability Analysis**
   - Review vulnerability scan results
   - Prioritize remediation efforts
   - Track mitigation progress

3. **Compliance Check**
   - Ensure all required metadata present
   - Verify format compliance
   - Check signature validity

## SBOM Storage and Distribution

### Storage Locations

1. **GitHub Releases**

   ```
   https://github.com/BrianCLong/summit/releases/tag/v1.24.0
   ├── sbom-web.spdx.json
   ├── sbom-server.spdx.json
   ├── sbom-gateway.spdx.json
   └── sbom-manifest.json
   ```

2. **Container Registry**
   - Attached as OCI artifacts
   - Signed with cosign
   - Linked to specific image digests

3. **Internal SBOM Repository**
   ```
   SECURITY/sbom/
   ├── v1.24.0/
   │   ├── sbom-web.spdx.json
   │   ├── sbom-server.spdx.json
   │   ├── sbom-gateway.spdx.json
   │   └── sbom-manifest.json
   └── latest/
       ├── [symlinks to latest version]
   ```

### Access Control

| Stakeholder       | SBOM Access       | Purpose                              |
| ----------------- | ----------------- | ------------------------------------ |
| Security Team     | Full Access       | Vulnerability management, compliance |
| Development Team  | Read Access       | Dependency analysis, remediation     |
| Compliance Team   | Full Access       | Audit, reporting, compliance         |
| Operations Team   | Read Access       | Deployment verification              |
| External Auditors | Controlled Access | Compliance verification              |
| Customers         | Public SBOMs      | Transparency, risk assessment        |

## SBOM Lifecycle Management

### Version Control

```
SBOM Versioning Scheme: [release-version]-[build-number]
Example: v1.24.0-build.1234

Each SBOM includes:
- Source code commit SHA
- Build timestamp
- Tool versions used
- Generation parameters
```

### Retention Policy

| SBOM Type         | Retention Period | Storage Location   | Access Level |
| ----------------- | ---------------- | ------------------ | ------------ |
| Release SBOMs     | 7 years          | S3 + Archive       | Full         |
| Development SBOMs | 6 months         | S3                 | Limited      |
| Security SBOMs    | 10 years         | Compliance Archive | Restricted   |
| Audit SBOMs       | 25 years         | Legal Archive      | Audit Only   |

### Update Triggers

SBOMs are regenerated when:

- New container image is built
- Dependencies are updated
- Security patches are applied
- Configuration changes occur
- Manual regeneration is requested

## Vulnerability Correlation

### SBOM-CVE Mapping

```json
{
  "component": "express@4.18.2",
  "vulnerabilities": [
    {
      "cve": "CVE-2022-24999",
      "severity": "HIGH",
      "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      "status": "FIXED",
      "fixedIn": "4.18.3",
      "mitigations": ["WAF rules", "Input validation"]
    }
  ]
}
```

### Automated Vulnerability Scanning

```bash
# Daily vulnerability scan pipeline
for sbom in SECURITY/sbom/latest/*.spdx.json; do
  echo "Scanning $sbom for vulnerabilities..."
  grype sbom:$sbom --output json > ${sbom%.spdx.json}-vulns.json

  # Generate security report
  ./scripts/generate-security-report.sh $sbom ${sbom%.spdx.json}-vulns.json
done
```

## Supply Chain Security

### Trusted Source Verification

```yaml
# Dependency validation rules
npm_sources:
  allowed:
    - registry.npmjs.org
    - github.com (verified publishers only)
  blocked:
    - suspicious-registry.com
    - unverified sources

container_bases:
  allowed:
    - node:18-alpine (official)
    - ubuntu:22.04 (official)
  blocked:
    - unknown/untrusted images
```

### Build Reproducibility

```bash
# Reproducible build verification
./scripts/verify-reproducible-build.sh \
  --sbom sbom-web.spdx.json \
  --source-commit $GITHUB_SHA \
  --build-env production
```

## Compliance Integration

### SOC 2 Requirements

- **CC6.8**: Maintain accurate inventory of system components
- **CC7.1**: Detect and respond to security events
- Evidence: SBOM generation logs, vulnerability reports

### Executive Order 14028 (US)

- NTIA minimum elements compliance
- Software supplier attestations
- Vulnerability disclosure coordination

### EU Cyber Resilience Act

- CE marking requirements
- Vulnerability handling
- Documentation standards

## Tools and Automation

### SBOM Generation Stack

```yaml
Primary Tools:
  - syft: Package discovery and SBOM generation
  - cosign: Digital signatures and attestations
  - grype: Vulnerability scanning

Supporting Tools:
  - spdx-tools: Format validation
  - cyclonedx-cli: CycloneDX operations
  - dependency-track: SBOM analysis platform
```

### Custom Scripts

1. **SBOM Verification**

   ```bash
   ./scripts/verify-sbom-completeness.sh
   ./scripts/validate-sbom-format.sh
   ./scripts/check-sbom-signatures.sh
   ```

2. **Vulnerability Analysis**

   ```bash
   ./scripts/correlate-sbom-vulnerabilities.sh
   ./scripts/generate-risk-report.sh
   ./scripts/track-remediation-progress.sh
   ```

3. **Compliance Reporting**
   ```bash
   ./scripts/generate-compliance-report.sh
   ./scripts/export-sbom-evidence.sh
   ./scripts/create-audit-package.sh
   ```

## Incident Response

### SBOM-Related Incidents

1. **Compromised Dependency**
   - Identify affected components via SBOM
   - Assess blast radius and impact
   - Coordinate remediation efforts
   - Update SBOMs post-remediation

2. **Supply Chain Attack**
   - Verify component integrity via SBOM
   - Cross-reference with threat intelligence
   - Implement containment measures
   - Document lessons learned

3. **Compliance Violation**
   - Review SBOM completeness
   - Identify missing information
   - Implement corrective measures
   - Provide evidence to auditors

## Training and Awareness

### Development Team Training

- SBOM concepts and importance
- Dependency management best practices
- Security implications of package choices
- SBOM review procedures

### Operations Team Training

- SBOM verification procedures
- Deployment validation using SBOMs
- Incident response with SBOM data
- Compliance evidence collection

### Security Team Training

- Advanced SBOM analysis techniques
- Vulnerability correlation methods
- Supply chain threat modeling
- SBOM forensics capabilities

## Metrics and KPIs

### SBOM Quality Metrics

- **Completeness**: Percentage of components with full metadata
- **Accuracy**: Verification success rate
- **Timeliness**: Time from build to SBOM availability
- **Coverage**: Percentage of deployments with SBOMs

### Security Metrics

- **Vulnerability Detection**: Time to identify via SBOM
- **Response Time**: Time to patch vulnerable components
- **Risk Reduction**: Security posture improvement
- **Compliance**: Audit finding trends

## Future Enhancements

### Planned Improvements

- Real-time dependency monitoring
- Advanced supply chain analytics
- Machine learning for anomaly detection
- Integration with threat intelligence feeds

### Research Areas

- SBOM standardization evolution
- Quantum-safe cryptographic signatures
- Distributed ledger for supply chain transparency
- Zero-trust supply chain architectures

**Last Updated**: September 2025
**Next Review**: December 2025
**Owner**: Security Team
