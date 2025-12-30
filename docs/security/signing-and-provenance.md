# Release Signing, SBOM, and Provenance Verification

This repository now ships release assets with signed provenance metadata, SBOMs, and vulnerability reports to make supply-chain verification reproducible.

## What is published with each release

- **provenance.json** and **provenance.json.sig/pem**: immutable mapping from commit → built images (with digests, SBOM digests, Trivy report names) → test evidence artifact name.
- **evidence.tar.gz** and **evidence.tar.gz.sig/pem**: bundle containing SBOMs (CycloneDX + SPDX), Trivy SARIF results for each image, and test-evidence summaries.

## Verify release assets

```bash
# Download the assets from the target tag
TAG=v1.2.3
mkdir -p /tmp/summit-release && cd /tmp/summit-release
gh release download "$TAG" --pattern "provenance.json*"
gh release download "$TAG" --pattern "evidence.tar.gz*"

# Verify signatures for provenance and evidence bundles
COSIGN_EXPERIMENTAL=1 cosign verify-blob --yes \
  --cert provenance.json.pem \
  --signature provenance.json.sig \
  --certificate-identity-regexp "https://github.com/${GITHUB_REPOSITORY}/.github/workflows/release-ga.yml@.*" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  provenance.json

COSIGN_EXPERIMENTAL=1 cosign verify-blob --yes \
  --cert evidence.tar.gz.pem \
  --signature evidence.tar.gz.sig \
  --certificate-identity-regexp "https://github.com/${GITHUB_REPOSITORY}/.github/workflows/release-ga.yml@.*" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  evidence.tar.gz
```

## Verify container images

The provenance file includes the fully qualified image URIs (with digests) for each build. Use them directly:

```bash
PROVENANCE_PATH=/tmp/summit-release/provenance.json
SERVER_IMAGE=$(jq -r '.images[] | select(.name=="server") | .uri' "$PROVENANCE_PATH")
CLIENT_IMAGE=$(jq -r '.images[] | select(.name=="client") | .uri' "$PROVENANCE_PATH")

COSIGN_EXPERIMENTAL=1 cosign verify "$SERVER_IMAGE" \
  --certificate-identity-regexp "https://github.com/${GITHUB_REPOSITORY}/.github/workflows/_reusable-slsa-build.yml@.*" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com

COSIGN_EXPERIMENTAL=1 cosign verify "$CLIENT_IMAGE" \
  --certificate-identity-regexp "https://github.com/${GITHUB_REPOSITORY}/.github/workflows/_reusable-slsa-build.yml@.*" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

## Expected SBOM and vulnerability artifacts

- SBOMs (CycloneDX + SPDX) for each image are packaged inside `evidence.tar.gz` under the corresponding component folder.
- Trivy SARIF reports (High/Critical gating) are bundled alongside the SBOMs for transparency and can be uploaded to code scanning.
- Test evidence is emitted as `summary.json` inside the `test-evidence-<run_id>` folder and is referenced in `provenance.json` to bridge commit → test → image.

These checks are enforced in CI (builds fail on unresolved High/Critical CVEs) and deployments re-verify cosign signatures before any region promotion.
