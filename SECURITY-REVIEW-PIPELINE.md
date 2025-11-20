# CI/CD Pipeline Security Review

**Date:** 2025-11-20
**Reviewer:** DevSecOps Security Analysis
**Pipeline:** GitHub Actions
**Artifacts:** Docker Images (server, client, worker), npm packages

---

## Executive Summary

This security review analyzed the CI/CD pipeline for the IntelGraph platform, which uses GitHub Actions for continuous integration and deployment. The review identified **10 high-priority security risks** across dependency management, artifact signing, secrets management, and supply chain security.

**Key Findings:**
- ✅ Good: SBOM generation, Trivy scanning, CodeQL analysis already implemented
- ⚠️ Critical: No artifact signing or provenance attestation in production releases
- ⚠️ High: Unpinned action versions and Docker base images create supply chain risks
- ⚠️ High: Secrets hardcoded in docker-compose.yml files

---

## Section 1: Risk Assessment Table

| # | Risk | Likelihood | Impact | Mitigation Priority | Example Mitigation |
|---|------|------------|--------|---------------------|-------------------|
| 1 | **Unpinned GitHub Actions** - Actions in workflows use mutable tags (@v4, @master) instead of commit SHAs | **HIGH** | **HIGH** | **CRITICAL** | Pin all actions to full commit SHA with verification |
| 2 | **No Artifact Signing** - Docker images and release artifacts lack cryptographic signatures | **HIGH** | **CRITICAL** | **CRITICAL** | Implement Cosign signing with keyless OIDC |
| 3 | **Missing SLSA Provenance** - No build provenance metadata for supply chain verification | **MEDIUM** | **HIGH** | **HIGH** | Use slsa-github-generator for level 3+ provenance |
| 4 | **Hardcoded Secrets** - Database passwords and credentials in docker-compose.yml | **HIGH** | **CRITICAL** | **CRITICAL** | Move to GitHub Secrets, Vault, or SOPS encryption |
| 5 | **Unpinned Base Images** - Dockerfiles use version ranges (node:20-alpine) not digests | **MEDIUM** | **HIGH** | **HIGH** | Pin all base images to SHA256 digests |
| 6 | **No SBOM Attestation** - SBOM generated but not cryptographically attached to artifacts | **MEDIUM** | **MEDIUM** | **HIGH** | Attest SBOMs to container images with in-toto |
| 7 | **Insufficient Secrets Scanning** - Only gitleaks, no runtime secret detection | **MEDIUM** | **HIGH** | **MEDIUM** | Add TruffleHog, implement pre-commit hooks |
| 8 | **Missing Deployment Verification** - No verification that deployed images are signed/attested | **HIGH** | **CRITICAL** | **CRITICAL** | Add admission controller with signature verification |
| 9 | **Broad Workflow Permissions** - Some workflows have excessive GITHUB_TOKEN permissions | **MEDIUM** | **MEDIUM** | **MEDIUM** | Apply principle of least privilege per job |
| 10 | **No Dependency Lock Verification** - pnpm-lock.yaml integrity not enforced in CI | **MEDIUM** | **HIGH** | **HIGH** | Add lockfile validation and drift detection |

---

## Section 2: Detailed Risk Analysis & Mitigations

### Risk #1: Unpinned GitHub Actions

**Description:**
Multiple workflows use mutable action references (e.g., `actions/checkout@v4`, `aquasecurity/trivy-action@master`) that can be updated without notice. This creates a supply chain attack vector where compromised action versions could inject malicious code.

**Current State:**
```yaml
# .github/workflows/release.yml (line 23)
- uses: actions/checkout@v4  # Mutable tag

# .github/workflows/image-ci.yml (line 33)
- uses: aquasecurity/trivy-action@master  # Extremely dangerous
```

**Mitigation Steps:**

1. Pin all actions to full commit SHA with comment showing the version
2. Use Dependabot to monitor action updates
3. Implement action version verification in pre-commit hooks

**Example Hardened Config:**
```yaml
# Pin to immutable commit SHA
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
  with:
    fetch-depth: 0

- uses: aquasecurity/trivy-action@915b19bbe73b92a6cf82a1bc12b087c9a19a5fe2  # 0.28.0
  with:
    image-ref: 'intelgraph-server:latest'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

**Implementation Commands:**
```bash
# Use action-validator to check pinning
gh extension install mpalmer/action-validator
gh action-validator --github-token=$GITHUB_TOKEN

# Add Dependabot config for GitHub Actions
cat > .github/dependabot.yml <<EOF
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "ci"
      include: "scope"
EOF
```

---

### Risk #2: No Artifact Signing

**Description:**
Docker images built in the pipeline have placeholder signing steps that don't execute. This means consumers cannot verify image authenticity, integrity, or provenance.

**Current State:**
```yaml
# .github/workflows/image-ci.yml (lines 51-61)
- name: Sign Server Image with Cosign (Placeholder)
  run: echo "Cosign image signing for server would run here"
```

**Mitigation Steps:**

1. Install Cosign in the workflow
2. Use GitHub OIDC for keyless signing
3. Store signatures in OCI registry or Rekor transparency log
4. Verify signatures in deployment pipeline

**Example Hardened Config:**
```yaml
# Complete signing workflow
- name: Install Cosign
  uses: sigstore/cosign-installer@dc72c7d5c4d10cd6bcb8cf6e3fd625a9e5e537da  # v3.7.0

- name: Sign Server Image with Cosign
  env:
    COSIGN_EXPERIMENTAL: "true"  # Enable keyless signing
  run: |
    # Sign with keyless OIDC (uses GitHub's identity token)
    cosign sign --yes \
      --oidc-issuer=https://token.actions.githubusercontent.com \
      ${{ env.REGISTRY }}/intelgraph-server:${{ github.sha }}

    # Sign with a key stored in GitHub Secrets (alternative approach)
    # echo "${{ secrets.COSIGN_PRIVATE_KEY }}" > cosign.key
    # cosign sign --key cosign.key --yes \
    #   ${{ env.REGISTRY }}/intelgraph-server:${{ github.sha }}

- name: Verify Server Image Signature
  env:
    COSIGN_EXPERIMENTAL: "true"
  run: |
    cosign verify \
      --certificate-identity-regexp="^https://github.com/${{ github.repository }}" \
      --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
      ${{ env.REGISTRY }}/intelgraph-server:${{ github.sha }}

- name: Generate and attach SBOM
  run: |
    syft ${{ env.REGISTRY }}/intelgraph-server:${{ github.sha }} \
      -o spdx-json=sbom.spdx.json

    cosign attest --yes --predicate sbom.spdx.json \
      --type spdxjson \
      ${{ env.REGISTRY }}/intelgraph-server:${{ github.sha }}
```

**Setup for Keyless Signing:**
```yaml
# Add to workflow permissions
permissions:
  contents: read
  packages: write
  id-token: write  # Required for OIDC signing
```

---

### Risk #3: Missing SLSA Provenance

**Description:**
The pipeline doesn't generate SLSA (Supply chain Levels for Software Artifacts) provenance, which documents how artifacts were built and provides verifiable build metadata.

**Mitigation Steps:**

1. Integrate slsa-github-generator for SLSA Level 3+ provenance
2. Attest provenance to artifacts
3. Verify provenance before deployment

**Example Hardened Config:**
```yaml
# .github/workflows/release-slsa.yml
name: SLSA Release

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:

permissions: read-all

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-digest: ${{ steps.build.outputs.digest }}
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@c47758b77c9736f4b2ef4073d4d51994fabfe349  # v3.7.1

      - name: Login to GitHub Container Registry
        uses: docker/login-action@9780b0c442fbb1117ed29e0efdff1e18412f7567  # v3.3.0
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        id: build
        uses: docker/build-push-action@4f58ea79222b3b9dc2c8bbdd6debcef730109a75  # v6.9.0
        with:
          context: ./server
          file: ./server/Dockerfile.prod
          push: true
          tags: ghcr.io/${{ github.repository }}/server:${{ github.sha }}
          platforms: linux/amd64,linux/arm64
          sbom: true
          provenance: mode=max  # Generate provenance

  # Use SLSA generator for Level 3 provenance
  provenance:
    needs: [build]
    permissions:
      actions: read
      id-token: write
      packages: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v2.0.0
    with:
      image: ghcr.io/${{ github.repository }}/server
      digest: ${{ needs.build.outputs.image-digest }}
    secrets:
      registry-username: ${{ github.actor }}
      registry-password: ${{ secrets.GITHUB_TOKEN }}
```

---

### Risk #4: Hardcoded Secrets

**Description:**
The docker-compose.yml file contains hardcoded database passwords and credentials that are committed to version control.

**Current State:**
```yaml
# docker-compose.yml (lines 6-8, 45, 318)
environment:
  POSTGRES_PASSWORD: dev_password
  NEO4J_AUTH: neo4j/dev_password
  GF_SECURITY_ADMIN_PASSWORD: dev_password
```

**Mitigation Steps:**

1. Move all secrets to external secret management
2. Use .env files with .gitignore for local development
3. Use GitHub Secrets for CI/CD
4. Consider HashiCorp Vault or AWS Secrets Manager for production

**Example Hardened Config:**

**docker-compose.yml:**
```yaml
services:
  postgres:
    image: postgres:16-alpine@sha256:4ec9981a24b513b7e222d3c2b89e5bb9b2f295c4c0bf3e30d3f8dd0a6ce7c4a0
    container_name: postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-summit_dev}
      POSTGRES_USER: ${POSTGRES_USER:-summit}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
    env_file:
      - .env.local  # Not committed to git

  neo4j:
    image: neo4j:5.8@sha256:8f4a8d3c5b2e1a9f7c6d4e3b2a1c9f8e7d6c5b4a3e2f1a0b9c8d7e6f5a4b3c2d
    environment:
      NEO4J_AUTH: ${NEO4J_USER:-neo4j}/${NEO4J_PASSWORD:?NEO4J_PASSWORD must be set}
```

**.env.example:**
```bash
# Copy to .env.local and fill in real values
POSTGRES_PASSWORD=
NEO4J_PASSWORD=
GRAFANA_ADMIN_PASSWORD=
```

**.gitignore:**
```gitignore
.env.local
.env.production
.env.*.local
*.key
*.pem
secrets/
```

**GitHub Actions with Secrets:**
```yaml
# .github/workflows/deploy.yml
- name: Deploy to staging
  env:
    POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
    NEO4J_PASSWORD: ${{ secrets.NEO4J_PASSWORD }}
  run: |
    docker compose -f docker-compose.staging.yml up -d
```

---

### Risk #5: Unpinned Base Images

**Description:**
Dockerfiles use version tags (e.g., `node:20-alpine`) that can change, introducing unexpected vulnerabilities or breaking changes.

**Current State:**
```dockerfile
# Dockerfile (line 2)
FROM node:20-alpine AS base

# server/Dockerfile.prod (line 1)
FROM node:20-alpine AS builder
```

**Mitigation Steps:**

1. Pin all base images to SHA256 digests
2. Add comments with human-readable versions
3. Automate digest updates with Renovate or Dependabot
4. Verify image signatures when possible

**Example Hardened Config:**
```dockerfile
# Pin to specific digest with version comment
FROM node:20-alpine@sha256:6e0d0b5b9c5d5e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f AS base  # 20.18.1-alpine3.20
WORKDIR /app

# For Chainguard images (already good but add digest)
FROM cgr.dev/chainguard/node:20@sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2 AS runtime

# Verify base image signature (for signed images)
# RUN cosign verify --key /path/to/key.pub cgr.dev/chainguard/node:20@sha256:...
```

**Automated Updates with Renovate:**
```json
// renovate.json
{
  "extends": ["config:recommended"],
  "docker": {
    "enabled": true,
    "pinDigests": true
  },
  "packageRules": [
    {
      "matchDatasources": ["docker"],
      "matchUpdateTypes": ["digest"],
      "automerge": true,
      "schedule": ["before 6am on Monday"]
    }
  ]
}
```

---

### Risk #6: No SBOM Attestation

**Description:**
While SBOMs are generated, they're not cryptographically attached to artifacts, making it difficult to verify the SBOM matches the deployed artifact.

**Mitigation Steps:**

1. Generate SBOM during build
2. Attest SBOM to container image with in-toto
3. Verify attestations during deployment

**Example Hardened Config:**
```yaml
# Add to image-ci.yml after building images
- name: Generate SBOM with Syft
  run: |
    # Install Syft
    curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

    # Generate SBOM in multiple formats
    syft intelgraph-server:latest \
      -o spdx-json=sbom-server.spdx.json \
      -o cyclonedx-json=sbom-server.cdx.json

- name: Attest SBOM to Image
  env:
    COSIGN_EXPERIMENTAL: "true"
  run: |
    # Attach SBOM as attestation
    cosign attest --yes \
      --predicate sbom-server.spdx.json \
      --type spdxjson \
      ghcr.io/${{ github.repository }}/server:${{ github.sha }}

- name: Verify SBOM Attestation
  env:
    COSIGN_EXPERIMENTAL: "true"
  run: |
    # Verify the attestation exists and is valid
    cosign verify-attestation \
      --type spdxjson \
      --certificate-identity-regexp="^https://github.com/${{ github.repository }}" \
      --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
      ghcr.io/${{ github.repository }}/server:${{ github.sha }}

- name: Upload SBOM to Artifact Store
  uses: actions/upload-artifact@6f51ac03b9356f520e9adb1b1b7802705f340c2b  # v4.5.0
  with:
    name: sboms
    path: |
      sbom-server.spdx.json
      sbom-server.cdx.json
    retention-days: 90
```

---

### Risk #7: Insufficient Secrets Scanning

**Description:**
Only gitleaks is used for secret detection. No runtime secret scanning or pre-push validation exists.

**Mitigation Steps:**

1. Add TruffleHog for deeper secret detection
2. Implement pre-commit hooks
3. Add secret scanning to PR validation
4. Scan container images for embedded secrets

**Example Hardened Config:**
```yaml
# .github/workflows/security.yml - Add to secret-scan job
- name: Run TruffleHog
  uses: trufflesecurity/trufflehog@41e0d98c59a8e2d87797affa32ffc7bb81d75bfa  # v3.86.1
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
    extra_args: --only-verified --fail

- name: Scan images for embedded secrets
  run: |
    # Install trivy
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
      aquasec/trivy:0.58.1 image \
      --scanners secret \
      --severity HIGH,CRITICAL \
      --exit-code 1 \
      intelgraph-server:latest
```

**Pre-commit Hook (.husky/pre-commit):**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run gitleaks before commit
npx gitleaks protect --staged --verbose --redact

# Run TruffleHog on staged files
git diff --staged --name-only | xargs trufflehog filesystem --no-update --fail

# Prevent common secret patterns
git diff --cached --diff-filter=d | \
  grep -E "api[_-]?key|password|secret|token|aws[_-]?access" && \
  echo "Potential secret detected!" && exit 1

exit 0
```

---

### Risk #8: Missing Deployment Verification

**Description:**
No verification that deployed images are signed and attested before they run in production.

**Mitigation Steps:**

1. Implement admission controller (Kyverno, OPA Gatekeeper)
2. Verify signatures before pod creation
3. Validate SBOM attestations
4. Enforce policy compliance

**Example Hardened Config:**

**Kubernetes with Kyverno:**
```yaml
# kyverno-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: verify-cosign-signature
      match:
        any:
        - resources:
            kinds:
              - Pod
      verifyImages:
        - imageReferences:
            - "ghcr.io/yourorg/intelgraph-*:*"
          attestors:
            - count: 1
              entries:
                - keyless:
                    subject: "https://github.com/yourorg/summit/.github/workflows/*"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
          attestations:
            - predicateType: https://spdx.dev/Document
              conditions:
                - all:
                  - key: "{{ creator }}"
                    operator: Equals
                    value: "syft"
```

**OPA Policy for Docker Compose:**
```rego
# policy/deployment.rego
package deployment

import future.keywords.if

deny[msg] if {
    input.image
    not signed_image(input.image)
    msg := sprintf("Image %v must be signed before deployment", [input.image])
}

signed_image(image) if {
    # Call cosign verify in deployment script
    exec_output := shell("cosign verify " + image)
    exec_output.exit_code == 0
}
```

**Deployment Script with Verification:**
```bash
#!/bin/bash
# scripts/deploy-verified.sh

set -euo pipefail

IMAGE="ghcr.io/yourorg/intelgraph-server:${TAG}"

echo "Verifying image signature..."
cosign verify \
  --certificate-identity-regexp="^https://github.com/yourorg/summit" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  "${IMAGE}"

echo "Verifying SBOM attestation..."
cosign verify-attestation \
  --type spdxjson \
  --certificate-identity-regexp="^https://github.com/yourorg/summit" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  "${IMAGE}"

echo "Verifying SLSA provenance..."
cosign verify-attestation \
  --type slsaprovenance \
  --certificate-identity-regexp="^https://github.com/yourorg/summit" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  "${IMAGE}"

echo "All verifications passed. Deploying..."
docker compose -f docker-compose.production.yml up -d
```

---

### Risk #9: Broad Workflow Permissions

**Description:**
Some workflows have excessive GITHUB_TOKEN permissions that violate least privilege.

**Current State:**
```yaml
# .github/workflows/release.yml (lines 13-15)
permissions:
  contents: write  # Too broad
  packages: read
```

**Mitigation Steps:**

1. Apply least privilege to each job
2. Use job-level permissions, not workflow-level
3. Audit permissions regularly

**Example Hardened Config:**
```yaml
# Minimal workflow-level permissions
permissions:
  contents: read  # Default read-only

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read      # Only what's needed for checkout
      packages: read      # Only for pulling cached images
    steps:
      - uses: actions/checkout@...
      # Build steps

  release:
    needs: [build]
    runs-on: ubuntu-latest
    permissions:
      contents: write     # Only for creating releases
      packages: write     # Only for pushing images
      id-token: write     # Only for OIDC signing
    steps:
      # Release steps
```

---

### Risk #10: No Dependency Lock Verification

**Description:**
The pipeline doesn't verify that pnpm-lock.yaml hasn't been tampered with or has unexpected changes.

**Mitigation Steps:**

1. Verify lockfile integrity
2. Detect drift between package.json and lockfile
3. Fail CI on unexpected changes

**Example Hardened Config:**
```yaml
# .github/workflows/lockfile-verify.yml
name: Verify Lockfile Integrity

on:
  pull_request:
    paths:
      - 'package.json'
      - 'pnpm-lock.yaml'
      - '**/package.json'

jobs:
  verify-lockfile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2  # v4.0.0
        with:
          version: 9.12.0

      - name: Verify lockfile is up to date
        run: |
          pnpm install --frozen-lockfile --ignore-scripts

          # Check if lockfile was modified
          if ! git diff --exit-code pnpm-lock.yaml; then
            echo "ERROR: pnpm-lock.yaml is out of sync with package.json"
            echo "Run 'pnpm install' locally and commit the changes"
            exit 1
          fi

      - name: Audit dependencies
        run: |
          pnpm audit --audit-level=high

      - name: Check for malicious packages
        run: |
          # Use socket.dev or snyk to check for suspicious packages
          npx @socketsecurity/cli audit
```

---

## Section 3: Hardened Pipeline Implementation

### Complete Hardened Release Workflow

```yaml
# .github/workflows/release-hardened-complete.yml
name: Hardened Release Pipeline

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options:
          - staging
          - production

# Minimal default permissions
permissions:
  contents: read

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Pre-flight security checks
  preflight:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
        with:
          fetch-depth: 0

      - name: Verify lockfile integrity
        run: |
          pnpm install --frozen-lockfile --ignore-scripts
          git diff --exit-code pnpm-lock.yaml

      - name: Secret scan
        uses: gitleaks/gitleaks-action@cb7149629dbc67e0517b27a4bdf1c49a87bace88  # v2.4.0
        with:
          args: detect --source=. --no-banner --redact --exit-code=1

      - name: Deep secret scan with TruffleHog
        uses: trufflesecurity/trufflehog@41e0d98c59a8e2d87797affa32ffc7bb81d75bfa  # v3.86.1
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --only-verified --fail

  # SAST analysis
  sast:
    runs-on: ubuntu-latest
    needs: [preflight]
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - uses: github/codeql-action/init@5618a257b20b554e75bd2a16c881a208b309c91a  # v3.27.9
        with:
          languages: javascript,python
          queries: security-and-quality

      - uses: github/codeql-action/autobuild@5618a257b20b554e75bd2a16c881a208b309c91a  # v3.27.9

      - uses: github/codeql-action/analyze@5618a257b20b554e75bd2a16c881a208b309c91a  # v3.27.9
        with:
          category: "/language:javascript,python"

  # Build artifacts
  build:
    runs-on: ubuntu-latest
    needs: [preflight, sast]
    permissions:
      contents: read
      packages: write
    outputs:
      server-digest: ${{ steps.build-server.outputs.digest }}
      client-digest: ${{ steps.build-client.outputs.digest }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - uses: docker/setup-buildx-action@c47758b77c9736f4b2ef4073d4d51994fabfe349  # v3.7.1

      - uses: docker/login-action@9780b0c442fbb1117ed29e0efdff1e18412f7567  # v3.3.0
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build server image
        id: build-server
        uses: docker/build-push-action@4f58ea79222b3b9dc2c8bbdd6debcef730109a75  # v6.9.0
        with:
          context: ./server
          file: ./server/Dockerfile.prod
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/server:${{ github.sha }}
          platforms: linux/amd64,linux/arm64
          sbom: true
          provenance: mode=max
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build client image
        id: build-client
        uses: docker/build-push-action@4f58ea79222b3b9dc2c8bbdd6debcef730109a75  # v6.9.0
        with:
          context: ./client
          file: ./client/Dockerfile.prod
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/client:${{ github.sha }}
          platforms: linux/amd64,linux/arm64
          sbom: true
          provenance: mode=max
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Vulnerability scanning
  scan:
    runs-on: ubuntu-latest
    needs: [build]
    permissions:
      contents: read
      security-events: write
    strategy:
      matrix:
        image: [server, client]
    steps:
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@915b19bbe73b92a6cf82a1bc12b087c9a19a5fe2  # 0.28.0
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.image }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@5618a257b20b554e75bd2a16c881a208b309c91a  # v3.27.9
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

  # Generate and attest SBOMs
  sbom:
    runs-on: ubuntu-latest
    needs: [build, scan]
    permissions:
      contents: read
      packages: write
      id-token: write  # For keyless signing
    strategy:
      matrix:
        image: [server, client]
    steps:
      - name: Install Cosign
        uses: sigstore/cosign-installer@dc72c7d5c4d10cd6bcb8cf6e3fd625a9e5e537da  # v3.7.0

      - name: Install Syft
        uses: anchore/sbom-action/download-syft@fc46e51fd96aa00a87c8b47bff8f4d2d9b10f7b5  # v0.18.2

      - name: Generate SBOM
        run: |
          syft ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.image }}:${{ github.sha }} \
            -o spdx-json=sbom-${{ matrix.image }}.spdx.json \
            -o cyclonedx-json=sbom-${{ matrix.image }}.cdx.json

      - name: Attest SBOM to image
        env:
          COSIGN_EXPERIMENTAL: "true"
        run: |
          cosign attest --yes \
            --predicate sbom-${{ matrix.image }}.spdx.json \
            --type spdxjson \
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.image }}:${{ github.sha }}

      - name: Upload SBOM artifact
        uses: actions/upload-artifact@6f51ac03b9356f520e9adb1b1b7802705f340c2b  # v4.5.0
        with:
          name: sbom-${{ matrix.image }}
          path: sbom-${{ matrix.image }}.*
          retention-days: 90

  # Sign images
  sign:
    runs-on: ubuntu-latest
    needs: [sbom]
    permissions:
      contents: read
      packages: write
      id-token: write
    strategy:
      matrix:
        image: [server, client]
    steps:
      - name: Install Cosign
        uses: sigstore/cosign-installer@dc72c7d5c4d10cd6bcb8cf6e3fd625a9e5e537da  # v3.7.0

      - name: Sign container image
        env:
          COSIGN_EXPERIMENTAL: "true"
        run: |
          cosign sign --yes \
            --oidc-issuer=https://token.actions.githubusercontent.com \
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.image }}:${{ github.sha }}

      - name: Verify signature
        env:
          COSIGN_EXPERIMENTAL: "true"
        run: |
          cosign verify \
            --certificate-identity-regexp="^https://github.com/${{ github.repository }}" \
            --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.image }}:${{ github.sha }}

  # SLSA provenance (Level 3)
  provenance:
    needs: [sign]
    permissions:
      actions: read
      id-token: write
      packages: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v2.0.0
    with:
      image: ${{ needs.build.outputs.server-digest }}
      digest: ${{ needs.build.outputs.server-digest }}
    secrets:
      registry-username: ${{ github.actor }}
      registry-password: ${{ secrets.GITHUB_TOKEN }}

  # Policy enforcement
  policy:
    runs-on: ubuntu-latest
    needs: [sign]
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - name: Validate with OPA
        uses: open-policy-agent/setup-opa@34a30e8a924d1b03ce2cf7abe97250bbb1f332b5  # v2.2.0
        with:
          version: 0.70.0

      - name: Run policy checks
        run: |
          opa test policy/ -v

          # Validate deployment configuration
          opa eval --data policy/ --input deployment-config.json \
            "data.deployment.deny" | jq -e 'length == 0'

  # Deploy to staging (requires all checks to pass)
  deploy-staging:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: [policy, provenance]
    permissions:
      contents: read
      id-token: write
    environment:
      name: staging
      url: https://staging.intelgraph.example.com
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - name: Install Cosign
        uses: sigstore/cosign-installer@dc72c7d5c4d10cd6bcb8cf6e3fd625a9e5e537da  # v3.7.0

      - name: Verify images before deployment
        env:
          COSIGN_EXPERIMENTAL: "true"
        run: |
          for image in server client; do
            echo "Verifying $image..."

            # Verify signature
            cosign verify \
              --certificate-identity-regexp="^https://github.com/${{ github.repository }}" \
              --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
              ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${image}:${{ github.sha }}

            # Verify SBOM attestation
            cosign verify-attestation \
              --type spdxjson \
              --certificate-identity-regexp="^https://github.com/${{ github.repository }}" \
              --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
              ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${image}:${{ github.sha }}
          done

      - name: Deploy to staging
        run: |
          # Deploy with verified images
          export SERVER_IMAGE=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/server:${{ github.sha }}
          export CLIENT_IMAGE=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/client:${{ github.sha }}

          docker compose -f docker-compose.staging.yml up -d

      - name: Run smoke tests
        run: |
          npm run smoke:ci

      - name: Health check
        run: |
          ./scripts/health-check.sh staging

  # Production deployment (manual approval required)
  deploy-production:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    permissions:
      contents: read
      id-token: write
    environment:
      name: production
      url: https://intelgraph.example.com
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - name: Install Cosign
        uses: sigstore/cosign-installer@dc72c7d5c4d10cd6bcb8cf6e3fd625a9e5e537da  # v3.7.0

      - name: Verify images before production deployment
        env:
          COSIGN_EXPERIMENTAL: "true"
        run: |
          for image in server client; do
            # Triple verification for production
            cosign verify \
              --certificate-identity-regexp="^https://github.com/${{ github.repository }}" \
              --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
              ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${image}:${{ github.sha }}

            cosign verify-attestation --type spdxjson \
              --certificate-identity-regexp="^https://github.com/${{ github.repository }}" \
              --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
              ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${image}:${{ github.sha }}

            cosign verify-attestation --type slsaprovenance \
              --certificate-identity-regexp="^https://github.com/${{ github.repository }}" \
              --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
              ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${image}:${{ github.sha }}
          done

      - name: Deploy to production
        run: |
          # Blue-green deployment
          ./scripts/deploy-production.sh \
            --image-server=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/server:${{ github.sha }} \
            --image-client=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/client:${{ github.sha }} \
            --strategy=blue-green

      - name: Smoke test production
        run: |
          npm run smoke:production

      - name: Create release
        if: success()
        uses: softprops/action-gh-release@c062e08bd532815e2082a85e87e3ef29c3e6d191  # v2.2.1
        with:
          generate_release_notes: true
          files: |
            sbom-*.json
```

---

### Hardened Dockerfile

```dockerfile
# server/Dockerfile.hardened
# Pin all base images to SHA256 digests and verify signatures

# Build stage
FROM node:20-alpine@sha256:6e0d0b5b9c5d5e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3=3.11.9-r0 \
    make=4.4.1-r2 \
    g++=13.2.1_git20240309-r0 \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy dependency manifests first (better caching)
COPY package.json pnpm-lock.yaml ./

# Verify lockfile hasn't been tampered with
RUN npm install -g pnpm@9.12.0 \
    && pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Remove dev dependencies
RUN pnpm prune --prod

# Runtime stage using distroless/chainguard (minimal attack surface)
FROM cgr.dev/chainguard/node:20@sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2 AS runtime

WORKDIR /app

# Copy only production artifacts
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./

# Security: Already runs as nonroot user (UID 65532) in Chainguard image
# No need to create user - already built-in

# Add security labels
LABEL org.opencontainers.image.source="https://github.com/yourorg/summit"
LABEL org.opencontainers.image.description="IntelGraph Server - Hardened Production Build"
LABEL org.opencontainers.image.licenses="MIT"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["/nodejs/bin/node", "-e", "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]

# Expose port
EXPOSE 4000

# Security: Read-only root filesystem (mount tmp as tmpfs)
# Set in docker-compose or k8s manifest:
# read_only: true
# tmpfs:
#   - /tmp

# Run application
CMD ["node", "dist/server.js"]
```

---

## Section 4: Security Checklist for Future Pipeline Changes

Use this checklist whenever you add or modify CI/CD workflows:

### Before Adding a New Workflow

- [ ] **Pin all GitHub Actions to commit SHAs** with version comments
- [ ] **Apply least privilege permissions** at job level, not workflow level
- [ ] **Enable required status checks** in branch protection rules
- [ ] **Use CODEOWNERS** file to require security team review for workflow changes

### For Every Build Job

- [ ] **Pin base images to SHA256 digests** in Dockerfiles
- [ ] **Run SAST analysis** (CodeQL, Semgrep)
- [ ] **Scan for secrets** (gitleaks, TruffleHog)
- [ ] **Audit dependencies** (`pnpm audit`, `npm audit`)
- [ ] **Verify lockfile integrity** (`--frozen-lockfile`)
- [ ] **Run unit and integration tests** before building artifacts

### For Container Image Builds

- [ ] **Use multi-stage builds** to minimize image size
- [ ] **Build with SBOM generation** enabled (`--sbom`)
- [ ] **Build with provenance** enabled (`--provenance mode=max`)
- [ ] **Scan with Trivy** for vulnerabilities (HIGH/CRITICAL)
- [ ] **Run Dockerfile linting** (hadolint)
- [ ] **Check for secrets in images** (`trivy image --scanners secret`)

### For Artifact Signing & Attestation

- [ ] **Sign all artifacts** with Cosign using keyless OIDC
- [ ] **Generate SBOM** with Syft or buildkit
- [ ] **Attest SBOM** to artifacts with in-toto format
- [ ] **Generate SLSA provenance** using slsa-github-generator
- [ ] **Verify signatures** in the same workflow (smoke test)
- [ ] **Upload artifacts** with appropriate retention policies

### For Deployment Jobs

- [ ] **Require manual approval** for production (GitHub Environment protection)
- [ ] **Verify artifact signatures** before deployment
- [ ] **Verify SBOM attestations** before deployment
- [ ] **Verify SLSA provenance** before deployment
- [ ] **Run policy checks** with OPA/Kyverno
- [ ] **Execute smoke tests** after deployment
- [ ] **Enable rollback mechanism** in deployment scripts

### For Secret Management

- [ ] **Never commit secrets** to version control
- [ ] **Use GitHub Secrets** for CI/CD credentials
- [ ] **Rotate secrets regularly** (document rotation schedule)
- [ ] **Scope secrets appropriately** (environment-specific)
- [ ] **Use OIDC tokens** instead of long-lived credentials when possible
- [ ] **Enable secret scanning** on the repository

### For Monitoring & Auditing

- [ ] **Enable audit logs** for workflow runs
- [ ] **Send SBOM to dependency tracking** (Dependency-Track, etc.)
- [ ] **Upload SARIF results** to GitHub Security tab
- [ ] **Monitor for workflow failures** (set up alerts)
- [ ] **Track deployment frequency** and failure rates
- [ ] **Review security alerts** weekly

### Quarterly Security Reviews

- [ ] **Audit all workflow permissions** (review GITHUB_TOKEN usage)
- [ ] **Update pinned action SHAs** (via Dependabot/Renovate)
- [ ] **Review secret rotation status** (check last rotation dates)
- [ ] **Test incident response** (simulate compromised workflow)
- [ ] **Review access controls** (who can modify workflows?)
- [ ] **Update security policies** based on new threats

---

## Quick Reference: Common Security Commands

### Verify Signed Image
```bash
cosign verify \
  --certificate-identity-regexp="^https://github.com/yourorg/summit" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  ghcr.io/yourorg/summit/server:sha256abc123
```

### Verify SBOM Attestation
```bash
cosign verify-attestation \
  --type spdxjson \
  --certificate-identity-regexp="^https://github.com/yourorg/summit" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  ghcr.io/yourorg/summit/server:sha256abc123
```

### Generate SBOM
```bash
syft ghcr.io/yourorg/summit/server:latest -o spdx-json=sbom.spdx.json
```

### Scan for Vulnerabilities
```bash
trivy image --severity HIGH,CRITICAL ghcr.io/yourorg/summit/server:latest
```

### Scan for Secrets
```bash
gitleaks detect --source=. --verbose --redact
trufflehog filesystem . --only-verified
```

### Validate OPA Policy
```bash
opa test policy/ -v
opa eval --data policy/ --input config.json "data.policy.deny"
```

---

## Implementation Priority

**Phase 1 (Critical - Implement Immediately):**
1. Pin all GitHub Actions to commit SHAs
2. Implement Cosign signing for container images
3. Remove hardcoded secrets from docker-compose.yml
4. Add deployment signature verification

**Phase 2 (High - Implement Within 2 Weeks):**
5. Pin base images to SHA256 digests
6. Implement SBOM attestation
7. Add SLSA provenance generation
8. Implement comprehensive secret scanning

**Phase 3 (Medium - Implement Within 1 Month):**
9. Refine workflow permissions (least privilege)
10. Implement lockfile verification
11. Add admission controller for k8s (if applicable)
12. Set up automated security scanning dashboard

---

## Additional Resources

- **SLSA Framework:** https://slsa.dev/
- **Sigstore/Cosign Docs:** https://docs.sigstore.dev/
- **GitHub Actions Security:** https://docs.github.com/en/actions/security-guides
- **OWASP CI/CD Security:** https://owasp.org/www-project-top-10-ci-cd-security-risks/
- **CIS Docker Benchmark:** https://www.cisecurity.org/benchmark/docker
- **Trivy Documentation:** https://aquasecurity.github.io/trivy/

---

**End of Security Review**
