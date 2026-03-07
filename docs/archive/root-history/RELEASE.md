# Release Process & Governance

This document defines the rigorous process for releasing Summit to General Availability.

## Release Cadence

- **Major Releases**: Quarterly (e.g., v1.0, v2.0). Requires full audit.
- **Minor Releases**: Bi-weekly (e.g., v1.1, v1.2). Requires regression suite.
- **Hotfixes**: As needed (e.g., v1.0.1). Requires rapid roll-forward.

## Release Pipeline (`.github/workflows/release-ga.yml`)

The release pipeline is fully automated and secured via SLSA Level 3 principles.

### Stages

1.  **Build & Test**: Unit tests, Integration tests, Linting.
2.  **SBOM Generation**: CycloneDX and SPDX formats generated.
3.  **Container Build**: Docker build with pinned dependencies.
4.  **Signing**: Artifacts signed with Cosign (Keyless / OIDC).
5.  **Attestation**: SLSA provenance generated and attached to the image.
6.  **Verification**: Signature and SBOM diff verified before publishing.

## Governance Gates

| Gate              | Description                                      | Owner          |
| ----------------- | ------------------------------------------------ | -------------- |
| **Security Scan** | Zero critical vulnerabilities (Trivy).           | Security Agent |
| **SBOM Diff**     | Changes < 5% from baseline or explicit approval. | Release Agent  |
| **Performance**   | No regression in p95 latency > 10%.              | Ops Agent      |
| **Legal**         | No GPL/AGPL dependencies.                        | Legal Agent    |

## Rollback Procedure

If a release fails in production:

1.  **Identify**: Alert triggers SEV1/SEV2.
2.  **Revert**: `helm rollback summit <previous-revision>`.
3.  **Verify**: Check health endpoints.
4.  **Analyze**: Postmortem required before next attempt.

## Artifacts

All release artifacts are published to:

- **Container Images**: `ghcr.io/intelgraph/platform`
- **Helm Charts**: `ghcr.io/intelgraph/charts/summit`
- **Signatures**: `.sig` and `.att` files alongside images.
