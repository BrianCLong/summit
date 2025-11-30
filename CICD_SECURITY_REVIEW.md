# CI/CD Security Review & Hardening Recommendations

**Date**: 2025-11-28
**Reviewer**: Claude (AI Assistant)
**Scope**: GitHub Actions workflows, particularly `.github/workflows/ci.yml`
**CI System**: GitHub Actions

---

## Executive Summary

**Overall Risk Level**: **MEDIUM** (7 risks identified: 2 High, 3 Medium, 2 Low)

**Key Findings**:
1. ❌ Actions not pinned to SHA (supply chain risk)
2. ❌ No artifact signing/verification
3. ❌ Security scans are non-blocking (`continue-on-error: true`)
4. ⚠️ Limited permissions granted (good, but could be more granular)
5. ⚠️ Docker layer cache poisoning risk
6. ⚠️ No provenance/SL SA attestation
7. ✅ Good: Production guardrails check, Trivy+SBOM, pnpm lockfile enforced

---

## Security Risks & Mitigations

| # | Risk | Likelihood | Impact | Severity | Mitigation | Effort |
|---|------|-----------|--------|----------|------------|--------|
| **1** | **Unpinned GitHub Actions** | High | High | **HIGH** | Pin all actions to commit SHA | Low |
| **2** | **No Artifact Signing** | Medium | High | **HIGH** | Sign container images, SBOM | Medium |
| **3** | **Security Scans Non-Blocking** | High | Medium | **MEDIUM** | Make Trivy blocking for CRITICAL | Low |
| **4** | **Docker Cache Poisoning** | Low | High | **MEDIUM** | Use registry cache instead of local | Medium |
| **5** | **No SLSA Provenance** | Medium | Medium | **MEDIUM** | Add provenance attestation | Medium |
| **6** | **Overly Broad Permissions** | Low | Low | **LOW** | Use job-level permissions | Low |
| **7** | **No Dependency Hash Verification** | Low | Medium | **LOW** | Add Sigstore cosign verification | High |

---

## Risk Details

### Risk #1: Unpinned GitHub Actions (HIGH)

**Current Code**:
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
- uses: pnpm/action-setup@v4
- uses: actions/cache@v4
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
- uses: anchore/sbom-action@v0
- uses: aquasecurity/trivy-action@0.24.0
```

**Problem**: Using mutable tags (v4, v3, @v0) allows upstream maintainers to change action code. A compromised action could:
- Steal secrets (GITHUB_TOKEN, npm tokens)
- Inject malicious code into build
- Exfiltrate source code

**Exploit Scenario**:
1. Attacker compromises `actions/checkout` repository
2. Pushes malicious code to v4 tag
3. Our workflow runs compromised action
4. Secrets exfiltrated, backdoor injected into build

**Mitigation**:
```yaml
# Pin to commit SHA with comment showing version
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8  # v4.0.2
- uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398b4e9f4d  # v4.0.0
- uses: actions/cache@0c45773b623bea8c8e75f6c82b208c3cf94ea4f9  # v4.0.2
```

**Automation**: Use Dependabot to keep SHAs up-to-date:
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"
```

---

### Risk #2: No Artifact Signing (HIGH)

**Current Code**:
```yaml
- name: Build API image (cached)
  uses: docker/build-push-action@v6
  with:
    tags: summit/api:ci
    push: false  # ← No signing
```

**Problem**: No cryptographic guarantee that artifacts are from legitimate builds. Attacker who gains access to artifact storage could:
- Replace images with trojaned versions
- MITM download and inject malware

**Mitigation**:
Add Sigstore cosign signing:

```yaml
- name: Install cosign
  uses: sigstore/cosign-installer@59acb6260d9c0ba8f4a2f9d9b48431a222b68e20  # v3.5.0

- name: Build and sign API image
  uses: docker/build-push-action@3b5e8027fcad23fda98b2e3ac259d8d67585f671  # v6.5.0
  with:
    context: ./server
    file: ./server/Dockerfile.dev
    tags: summit/api:ci-${{ github.sha }}
    push: false
    load: true

- name: Sign image
  run: |
    cosign sign --yes --key env://COSIGN_PRIVATE_KEY summit/api:ci-${{ github.sha }}
  env:
    COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
    COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}

- name: Generate SBOM and sign
  run: |
    syft summit/api:ci-${{ github.sha }} -o spdx-json > sbom.spdx.json
    cosign attest --yes --key env://COSIGN_PRIVATE_KEY --predicate sbom.spdx.json summit/api:ci-${{ github.sha }}
  env:
    COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
    COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
```

**Setup**:
```bash
# Generate signing key pair
cosign generate-key-pair

# Add to GitHub secrets
gh secret set COSIGN_PRIVATE_KEY < cosign.key
gh secret set COSIGN_PASSWORD --body "<password>"

# Store public key in repo for verification
cp cosign.pub .github/cosign.pub
git add .github/cosign.pub && git commit -m "Add cosign public key"
```

**Verification** (in deployment):
```bash
cosign verify --key .github/cosign.pub summit/api:ci-<sha>
```

---

### Risk #3: Security Scans Non-Blocking (MEDIUM)

**Current Code**:
```yaml
security-scan:
  runs-on: ubuntu-latest
  continue-on-error: true  # ← Non-blocking!
  steps:
    - name: Trivy vulnerability scan
      uses: aquasecurity/trivy-action@0.24.0
      with:
        exit-code: '0'  # ← Never fails!
        severity: CRITICAL,HIGH
```

**Problem**: Critical vulnerabilities don't block merge. A PR with a known RCE vulnerability could be merged and deployed.

**Mitigation**:
Make CRITICAL vulnerabilities blocking:

```yaml
security-scan:
  runs-on: ubuntu-latest
  # Remove continue-on-error
  steps:
    - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1

    - name: Trivy vulnerability scan (CRITICAL = block)
      uses: aquasecurity/trivy-action@6e7b7d1fd3e4fef0c5fa8cce1229c54b2c9bd0d8  # v0.24.0
      with:
        scan-type: fs
        format: sarif
        output: trivy-results.sarif
        severity: CRITICAL
        exit-code: '1'  # Fail on CRITICAL

    - name: Upload Trivy results to GitHub Security
      uses: github/codeql-action/upload-sarif@v3
      if: always()
      with:
        sarif_file: trivy-results.sarif

    - name: Trivy scan for HIGH (advisory only)
      uses: aquasecurity/trivy-action@6e7b7d1fd3e4fef0c5fa8cce1229c54b2c9bd0d8  # v0.24.0
      with:
        scan-type: fs
        format: table
        severity: HIGH
        exit-code: '0'  # Advisory only
      continue-on-error: true
```

**Branch Protection Rule**:
```
Require status checks to pass:
  ✓ security-scan
```

---

### Risk #4: Docker Cache Poisoning (MEDIUM)

**Current Code**:
```yaml
- name: Cache Docker layers
  uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ hashFiles(...) }}
    restore-keys: ${{ runner.os }}-buildx-
```

**Problem**: Cache can be poisoned by:
1. A malicious PR updating files used in cache key hash
2. Restoring cache from forked PR runs (if enabled)
3. Cache key collision

**Exploit Scenario**:
1. Attacker opens PR modifying `docker-compose.dev.yml` (cache key input)
2. PR workflow populates cache with trojaned layers
3. Main branch workflow restores poisoned cache
4. Malicious code included in production build

**Mitigation #1**: Use registry cache instead of local:
```yaml
- name: Build API image (with registry cache)
  uses: docker/build-push-action@3b5e8027fcad23fda98b2e3ac259d8d67585f671  # v6.5.0
  with:
    context: ./server
    file: ./server/Dockerfile.dev
    tags: ghcr.io/${{ github.repository }}/api:ci-${{ github.sha }}
    push: false
    cache-from: type=registry,ref=ghcr.io/${{ github.repository }}/api:buildcache
    cache-to: type=registry,ref=ghcr.io/${{ github.repository }}/api:buildcache,mode=max
```

**Mitigation #2**: Isolate PR caches:
```yaml
- name: Cache Docker layers
  uses: actions/cache@0c45773b623bea8c8e75f6c82b208c3cf94ea4f9  # v4.0.2
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.event_name }}-${{ github.ref }}-${{ hashFiles(...) }}
    # NO restore-keys (prevents cross-branch cache poisoning)
```

---

### Risk #5: No SLSA Provenance (MEDIUM)

**Current State**: No build provenance attestation

**Problem**: Can't verify:
- Build was from this repo
- Build used expected workflow
- Artifacts are authentic

**Mitigation**: Add SLSA provenance using GitHub's generator:

```yaml
# .github/workflows/build.yml (separate workflow for provenance)
name: Build with SLSA Provenance
on:
  push:
    branches: [main]
  release:
    types: [published]

permissions:
  contents: read
  actions: read
  id-token: write
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@f95db51fddba0c2d1ec667646a06c2ce06100226  # v3.3.0

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@343f7c4344506bcbf9b4de18042ae17996df046d  # v3.0.0
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        id: build
        uses: docker/build-push-action@3b5e8027fcad23fda98b2e3ac259d8d67585f671  # v6.5.0
        with:
          context: ./server
          push: true
          tags: ghcr.io/${{ github.repository }}/api:${{ github.sha }}

  provenance:
    needs: [build]
    permissions:
      actions: read
      id-token: write
      packages: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v2.0.0
    with:
      image: ghcr.io/${{ github.repository }}/api
      digest: ${{ needs.build.outputs.image-digest }}
    secrets:
      registry-username: ${{ github.actor }}
      registry-password: ${{ secrets.GITHUB_TOKEN }}
```

**Verification**:
```bash
# Install slsa-verifier
gh release download -R slsa-framework/slsa-verifier -p "slsa-verifier-linux-amd64"

# Verify provenance
./slsa-verifier verify-image ghcr.io/yourorg/summit/api:<sha> \
  --source-uri github.com/yourorg/summit
```

---

### Risk #6: Overly Broad Permissions (LOW)

**Current Code** (workflow-level):
```yaml
permissions:
  contents: read
  security-events: write
```

**Problem**: All jobs inherit these permissions, violating least-privilege principle.

**Mitigation**: Use job-level permissions:

```yaml
# Top-level: deny all by default
permissions: {}

jobs:
  fast-checks:
    permissions:
      contents: read  # Only needs to read code

  security-scan:
    permissions:
      contents: read
      security-events: write  # Only security job needs this

  golden-path:
    permissions:
      contents: read
      actions: read  # For downloading artifacts
```

---

### Risk #7: No Dependency Hash Verification (LOW)

**Current Code**:
```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 9
```

**Problem**: `pnpm install --frozen-lockfile` ensures lockfile matches, but doesn't verify package hashes.

**Mitigation**: Use npm/pnpm provenance (experimental):

```bash
# In package.json scripts
"install:verified": "npm install --provenance"
```

Or add post-install integrity check:
```yaml
- name: Verify dependencies
  run: pnpm audit signatures
```

---

## Hardened CI Workflow (Complete)

```yaml
name: CI (Hardened)

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.head_ref || github.sha }}
  cancel-in-progress: true

# Deny all permissions by default
permissions: {}

env:
  PNPM_CACHE_FOLDER: ~/.pnpm-store
  NODE_VERSION: '20.x'

jobs:
  fast-checks:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      # Pin all actions to SHA
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8  # v4.0.2
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Enable corepack
        run: corepack enable

      - uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398b4e9f4d  # v4.0.0
        with:
          version: 9
          run_install: false

      - name: Cache pnpm store
        uses: actions/cache@0c45773b623bea8c8e75f6c82b208c3cf94ea4f9  # v4.0.2
        with:
          path: ${{ env.PNPM_CACHE_FOLDER }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm -w run lint

      - name: Typecheck
        run: pnpm -w run typecheck

      - name: Production guardrails
        run: |
          set +e
          NODE_ENV=production \
          JWT_SECRET=weaksecret \
          JWT_REFRESH_SECRET=weaksecret2 \
          DATABASE_URL=postgresql://summit:devpassword@localhost:5432/summit_dev \
          pnpm ci:prod-guard
          status=$?
          if [ "$status" -eq 0 ]; then
            echo "Prod guardrails command succeeded unexpectedly"
            exit 1
          fi
          echo "Prod guardrails correctly blocked unsafe config"

  security-scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1

      # CRITICAL vulnerabilities = blocking
      - name: Trivy scan (CRITICAL blocking)
        uses: aquasecurity/trivy-action@6e7b7d1fd3e4fef0c5fa8cce1229c54b2c9bd0d8  # v0.24.0
        with:
          scan-type: fs
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL
          exit-code: '1'  # Block on CRITICAL

      - name: Upload Trivy SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

      # HIGH vulnerabilities = advisory
      - name: Trivy scan (HIGH advisory)
        uses: aquasecurity/trivy-action@6e7b7d1fd3e4fef0c5fa8cce1229c54b2c9bd0d8  # v0.24.0
        with:
          scan-type: fs
          format: table
          severity: HIGH
          exit-code: '0'
        continue-on-error: true

      - name: Generate SBOM
        uses: anchore/sbom-action@e8d2a6937ecead383dfe75190d104edd1f9c5751  # v0.16.0
        with:
          path: .
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Upload SBOM
        uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3  # v4.3.1
        with:
          name: sbom-spdx
          path: sbom.spdx.json
          retention-days: 90

  build-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8  # v4.0.2
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Enable corepack
        run: corepack enable

      - uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398b4e9f4d  # v4.0.0
        with:
          version: 9
          run_install: false

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build workspace
        run: pnpm -w run build

      - name: Unit & integration tests
        run: pnpm -w run test

      - name: Upload build artifacts
        uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3  # v4.3.1
        with:
          name: build-artifacts
          path: |
            .turbo
            node_modules/.cache
          retention-days: 1

  # ... (golden-path job similar, with SHA-pinned actions)
```

---

## Implementation Checklist

**Phase 1: Quick Wins** (1-2 days)
- [ ] Pin all GitHub Actions to commit SHA
- [ ] Enable Dependabot for actions
- [ ] Make Trivy CRITICAL blocking
- [ ] Add job-level permissions

**Phase 2: Signing & Attestation** (3-5 days)
- [ ] Generate cosign key pair
- [ ] Add image signing to build workflow
- [ ] Add SBOM attestation
- [ ] Implement SLSA provenance workflow

**Phase 3: Cache Hardening** (2-3 days)
- [ ] Migrate to registry-based cache
- [ ] Isolate PR caches from main
- [ ] Add cache verification

---

## Post-Implementation Verification

```bash
# Verify actions are pinned
grep -r "uses:.*@v" .github/workflows/ || echo "✓ All actions pinned to SHA"

# Verify image signatures
cosign verify --key .github/cosign.pub ghcr.io/yourorg/summit/api:<sha>

# Verify SLSA provenance
slsa-verifier verify-image ghcr.io/yourorg/summit/api:<sha> \
  --source-uri github.com/yourorg/summit

# Check security scan is blocking
gh api repos/${{ github.repository }}/branches/main/protection/required_status_checks | jq '.contexts[] | select(. == "security-scan")'
```

---

**Last Updated**: 2025-11-28
**Next Review**: Quarterly or after major CI changes
**Owner**: Security Team + DevOps
