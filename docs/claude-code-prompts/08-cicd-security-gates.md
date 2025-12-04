# Prompt 8: CI/CD (GitHub Actions) + Security Gates

## Role
DevEx/SecOps Engineer

## Context
IntelGraph uses trunk-based development with:
- **Weekly release cuts** - Tagged releases every week
- **Biweekly production deployments** - Controlled rollouts every 2 weeks
- **Security gates** - SBOM, dependency scanning, policy validation
- **Automated quality checks** - Lint, typecheck, tests, E2E
- **Canary deployments** - Gradual rollout with auto-rollback

All changes must pass security and quality gates before merging.

## Task
Author GitHub Actions workflows for:

### 1. PR Checks (Continuous Integration)
- Lint, typecheck, unit tests
- SBOM generation (CycloneDX)
- Dependency vulnerability scanning (Trivy, Snyk, etc.)
- SAST scanning (Semgrep)
- OPA policy simulation
- Container build and push (on merge)

### 2. Deployment Pipeline (Continuous Delivery)
- Helm dry-run validation
- Canary deployment to staging
- Smoke tests against canary
- Auto-rollback on SLO breach or test failure
- Production deployment (manual approval or scheduled)

### 3. Security Gates
- Required PR reviews
- Environment protections (prod requires approval)
- Provenance artifacts uploaded to GHCR
- SLSA Level 3 attestations

## Guardrails

### Security
- All container images signed and attested
- SBOM attached to all releases
- No secrets in code (gitleaks pre-commit + CI)
- Dependency vulnerabilities blocked (HIGH/CRITICAL)

### Quality
- Minimum test coverage enforced
- TypeScript strict mode (gradual migration)
- No focused tests (`.only()`, `.skip()`)
- All workflows required for merge

## Deliverables

### 1. GitHub Actions Workflows
- [ ] `.github/workflows/ci.yml` - PR checks:
  - [ ] Checkout with LFS
  - [ ] pnpm install with caching
  - [ ] Lint (ESLint, Prettier)
  - [ ] Typecheck (tsc)
  - [ ] Unit tests (Jest with coverage)
  - [ ] Integration tests
  - [ ] E2E tests (Playwright)
  - [ ] SBOM generation
  - [ ] Trivy vulnerability scan
  - [ ] Semgrep SAST
  - [ ] OPA policy tests
  - [ ] Docker build (cache layers)

- [ ] `.github/workflows/security.yml` - Security checks:
  - [ ] CodeQL analysis
  - [ ] Dependency review
  - [ ] Gitleaks secret scanning
  - [ ] License compliance check

- [ ] `.github/workflows/release.yml` - Release automation:
  - [ ] Semantic release (conventional commits)
  - [ ] Changelog generation
  - [ ] Container image build and push
  - [ ] SLSA provenance attestation
  - [ ] Helm chart package and publish
  - [ ] Release notes generation

- [ ] `.github/workflows/deploy.yml` - Deployment:
  - [ ] Helm dry-run
  - [ ] Deploy to staging (canary)
  - [ ] Smoke tests
  - [ ] SLO validation
  - [ ] Deploy to production (with approval)
  - [ ] Auto-rollback on failure

### 2. Caching Strategy
- [ ] pnpm store cache (actions/cache)
- [ ] Turbo cache (remote or local)
- [ ] Docker layer cache (buildx with registry cache)
- [ ] Playwright browser cache

### 3. Artifacts & Evidence
- [ ] Upload test results and coverage
- [ ] Upload SBOM artifacts
- [ ] Upload vulnerability scan results
- [ ] Upload provenance attestations
- [ ] Upload deployment manifests

### 4. Documentation
- [ ] CI/CD pipeline overview
- [ ] Workflow trigger conditions
- [ ] Security gate requirements
- [ ] Rollback procedures

## Acceptance Criteria
- ✅ PRs blocked on failing lint/tests/security checks
- ✅ Tagged vX.Y.Z triggers release workflow
- ✅ Release notes auto-generated from commits
- ✅ SBOM and provenance attached to releases
- ✅ Canary deployment auto-rolls back on failure
- ✅ All workflows complete in < 15 minutes
- ✅ Evidence bundle (SBOM, scans, tests) published

## CI Workflow Example

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm test:ci --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json

  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: auto

  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate SBOM (CycloneDX)
        uses: CycloneDX/gh-node-module-generatebom@v1
        with:
          output: sbom.json

      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test, security-scan]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}/api:${{ github.sha }}
          cache-from: type=registry,ref=ghcr.io/${{ github.repository }}/api:buildcache
          cache-to: type=registry,ref=ghcr.io/${{ github.repository }}/api:buildcache,mode=max
```

## Release Workflow Example

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

permissions:
  contents: write
  packages: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate changelog
        id: changelog
        uses: conventional-changelog-action@v3
        with:
          preset: conventionalcommits

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body: ${{ steps.changelog.outputs.clean_changelog }}
          generate_release_notes: true

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push release image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/api:${{ github.ref_name }}
            ghcr.io/${{ github.repository }}/api:latest
          provenance: true
          sbom: true

      - name: Attest provenance
        uses: actions/attest-build-provenance@v1
        with:
          subject-name: ghcr.io/${{ github.repository }}/api
          subject-digest: ${{ steps.build.outputs.digest }}
```

## Deployment Workflow Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Helm dry-run
        run: |
          helm template intelgraph ./helm \
            --values ./helm/values-${{ github.event.inputs.environment }}.yaml \
            --dry-run

      - name: Deploy with Helm
        run: |
          helm upgrade --install intelgraph ./helm \
            --namespace intelgraph-${{ github.event.inputs.environment }} \
            --values ./helm/values-${{ github.event.inputs.environment }}.yaml \
            --wait \
            --timeout 10m

      - name: Run smoke tests
        run: |
          ./scripts/smoke-test.sh \
            --env ${{ github.event.inputs.environment }}

      - name: Check SLOs
        id: slo_check
        run: |
          ./scripts/check-slos.sh \
            --env ${{ github.event.inputs.environment }}

      - name: Rollback on failure
        if: failure()
        run: |
          helm rollback intelgraph \
            --namespace intelgraph-${{ github.event.inputs.environment }}
```

## Related Files
- `/home/user/summit/.github/workflows/` - Existing workflows
- `/home/user/summit/docs/CICD_BEST_PRACTICES.md` - CI/CD guidelines
- `/home/user/summit/scripts/ci/` - CI scripts

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 8: CI/CD pipeline implementation"

# Or use the slash command (if configured)
/cicd-pipeline
```

## Notes
- Use GitHub's built-in dependency graph and Dependabot
- Consider GitHub Advanced Security for CodeQL
- Use reusable workflows for common patterns
- Implement branch protection rules
- Use environments for staging/production with required reviewers
