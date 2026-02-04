# Supply Chain Security & SLSA Compliance

Summit implements a robust Supply Chain Security architecture designed to meet **SLSA Level 3** requirements. This ensures that all artifacts are built in a verifiable, hermetic environment and are tamper-proof.

## Architecture

The supply chain security pipeline consists of the following stages:

1.  **Source Integrity**: All commits are verified for signatures.
2.  **Hermetic Builds**: Docker images are built in isolated GitHub Actions environments using `docker buildx` with no external side-effects.
3.  **Provenance Generation**: SLSA v1 provenance is generated, cryptographically linking the artifact to the source code and build instructions.
4.  **SBOM Generation**: Software Bill of Materials (SBOM) is generated in SPDX and CycloneDX formats using `syft`.
5.  **Signing & Attestation**: Images and SBOMs are signed using `cosign` with Keyless OIDC (binding the signature to the GitHub Workflow identity).
6.  **Vulnerability Scanning**: Artifacts are scanned for vulnerabilities using `grype` or `trivy`.

## Workflows

### 1. `slsa-l3-provenance.yml`
This is the primary CI/CD workflow for security. It:
- Builds `intelgraph-server` and `intelgraph-web` images.
- Generates attestations for both.
- Scans for vulnerabilities.
- Verifies the signatures before "releasing" (conceptually).

### 2. `slsa-l3-airgap-build.yml`
Designed for high-security environments, this workflow:
- Builds artifacts and packages them into a tarball bundle.
- Includes standalone verification tools (`cosign`, `slsa-verifier`).
- Generates a manifest with hashes for all components.
- Supports offline transport via `docker save`.

## Verification

To verify an image manually:

```bash
# Verify the image signature
cosign verify ghcr.io/brianlong/intelgraph/server:latest \
  --certificate-identity-regexp="https://github.com/BrianCLong/intelgraph" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

# Verify the SBOM attestation
cosign verify-attestation ghcr.io/brianlong/intelgraph/server:latest \
  --type spdx \
  --certificate-identity-regexp="https://github.com/BrianCLong/intelgraph" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

## Sigstore Advisory Guardrails

Summit enforces Sigstore hardening actions in the supply-chain pipeline to address known integrity
and authentication flaws:

1. **Sigstore Golang (legacy TUF client) path traversal**
   - **Risk**: crafted TUF metadata can write outside the cache directory.
   - **Mitigation**: require `sigstore` **v1.10.4+** everywhere or disable the disk cache
     (`SIGSTORE_NO_CACHE=true`) in constrained environments.
2. **sigstore-python CSRF/OIDC state validation**
   - **Risk**: missing `state` validation in the OAuth flow allows cross-site request forgery.
   - **Mitigation**: require `sigstore-python` **v4.2.0+** across automation and developer tooling.

## Hardened Attestation Verification

Every CI/CD build produces a digest + attestation pair and verifies both before promotion:

```bash
cosign verify --key /trusted/roots/cosign.pub "$IMAGE_DIGEST"
cosign verify-attestation --type in-toto --key /trusted/roots/cosign.pub "$IMAGE_DIGEST"
```

If verification fails or the digest does not match, the pipeline blocks promotion and publishes the
attestation JSON as an artifact for audit review.

## Kubernetes Admission Enforcement

Cluster admission control uses the Sigstore Policy Controller with ClusterImagePolicy rules to
require signatures and attestations. Governed Exceptions are stored in a signed
`sigstore-exceptions` ConfigMap and validated by policy checks. Rollback is performed by switching
the admission controller to monitor mode or disabling the webhook while the exception expires.

## Local SBOM Generation

You can generate SBOMs locally using the helper script:

```bash
./scripts/sbom-attest.sh [all|server|web]
```

## Compliance Checklist (SLSA L3)

| Requirement | Implementation |
|-------------|----------------|
| **Verified History** | Git commit signing enforced. |
| **Retained 18mo** | GitHub Actions logs retained. |
| **Isolated** | GitHub Hosted Runners + Docker Buildx. |
| **Provenance** | Generated via `slsa-github-generator` / `build-push-action`. |
| **Ephemerality** | Fresh VM for every build. |
| **Parameterless** | Build script defined in repo (Dockerfile). |

## Air-Gap Deployment

For air-gapped environments:
1. Trigger the `slsa-l3-airgap-build.yml` workflow.
2. Download the `airgap-bundle` artifact.
3. Verify hashes matching the manifest.
4. Transfer to the secure network.
5. Use `docker load` to import images.
