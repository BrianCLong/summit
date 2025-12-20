# GitHub Actions Comprehensive Setup

This document describes the comprehensive GitHub Actions workflows implemented for the IntelGraph platform.

## Workflows Overview

### 1. CI - Comprehensive Pipeline (`ci-comprehensive.yml`)
**Trigger**: Push/PR to main, develop, claude/** branches
**Purpose**: Main quality gate for all code changes
**Components**:
- Lint & TypeCheck
- Unit & Integration Tests (with Postgres, Redis, Neo4j)
- Build & Attestation
- SBOM Generation
- OTEL Sanity Check
- Merge Readiness Gate

**Policy**: Blocks merge if lint, typecheck, build, or tests fail

### 2. Security - Comprehensive Scanning (`security-comprehensive.yml`)
**Trigger**: Push/PR + Daily schedule
**Purpose**: Security gates with zero-critical vulnerability budget
**Components**:
- CodeQL Analysis (JS/TS/Python)
- Dependency Review
- Secret Scanning (Gitleaks + TruffleHog)
- Vulnerability Scanning (Trivy)
- NPM Audit
- SBOM Generation (SPDX + CycloneDX)

**Policy**: Fails on critical vulnerabilities or secret leaks

### 3. Security - OWASP ZAP (`owasp-zap.yml`)
**Trigger**: Push/PR + Weekly schedule
**Purpose**: Web application security testing
**Components**:
- ZAP Baseline - Web App
- ZAP Baseline - Mobile Interface
- ZAP API Scan - GraphQL/REST

**Policy**: Non-blocking, reports issues

### 4. Helm - Chart Validation (`helm-validation.yml`)
**Trigger**: Changes to charts/**
**Purpose**: Validate Helm charts before release
**Components**:
- Helm Lint (strict mode)
- Template Validation
- Kubernetes Manifest Validation (kubeval)
- Package Charts
- Security Scan (Trivy)

**Policy**: Blocks merge if lint or template validation fails

### 5. Release - Comprehensive (`release-comprehensive.yml`)
**Trigger**: Tag push (v*.*.*)
**Purpose**: Multi-arch Docker release with signing
**Components**:
- Multi-arch Docker builds (linux/amd64, linux/arm64)
- Cosign signing
- SBOM generation per image/platform
- Helm chart packaging to OCI registry
- GitHub Release creation

**Artifacts**:
- Docker images: `ghcr.io/org/repo/{server,client,web}:version`
- Helm charts: `oci://ghcr.io/org/repo/charts`
- SBOMs: Attached to GitHub Release

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| PR Pipeline Duration | <10 min | ~8 min |
| Security Scan Duration | <15 min | ~12 min |
| Release Build Duration | <30 min | ~25 min |
| SBOM Generation | Every build | ✅ |
| Vulnerability Budget | 0 criticals | Enforced |

## Setup Requirements

### Secrets Required:
- `GITHUB_TOKEN` (auto-provided)
- `CODECOV_TOKEN` (optional, for coverage upload)
- `GITLEAKS_LICENSE` (optional, for Gitleaks)

### Branch Protection Rules:
Required status checks:
- `CI Pipeline Success`
- `Security Policy Enforcement`
- `Helm Validation Summary` (if charts changed)

## Matrix Builds

### CI Comprehensive:
- OS: ubuntu-latest
- Arch: x64, arm64 (setup only, tests run on x64)
- Node: 20

### Release:
- Platforms: linux/amd64, linux/arm64
- Images: server, client, web

## Artifacts

### Build Artifacts (7 days):
- `build-artifacts-{sha}`: Compiled dist/ directories
- `coverage-{sha}`: Coverage reports
- `helm-templates-{chart}`: Rendered Helm templates

### Security Artifacts (30-90 days):
- `sbom-{sha}`: SPDX + CycloneDX SBOMs
- `zap-*-report-{sha}`: OWASP ZAP scan results
- `trivy-results.sarif`: Uploaded to Security tab

### Release Artifacts (permanent):
- Docker images with signatures
- Helm chart packages
- SBOMs per image/platform

## Usage

### Running Manually:
```bash
# Trigger CI manually
gh workflow run ci-comprehensive.yml

# Trigger security scan
gh workflow run security-comprehensive.yml

# Create release
git tag v1.0.0
git push origin v1.0.0
```

### Local Testing:
```bash
# Lint
pnpm run lint

# Type check
pnpm run typecheck

# Build
pnpm run build

# Test
pnpm run test

# Helm lint
helm lint charts/intelgraph-maestro --strict
```

## Troubleshooting

### CI Failures:
1. Check lint errors: Review ESLint output
2. Type errors: Run `pnpm run typecheck` locally
3. Test failures: Check test logs in Actions

### Security Scan Failures:
1. Critical vulnerabilities: Review Trivy SARIF in Security tab
2. Secret leaks: Check Gitleaks output, rotate secrets
3. Dependency issues: Review npm audit report artifact

### Release Failures:
1. Docker build: Check Dockerfile syntax
2. Cosign signing: Verify OIDC permissions
3. Helm push: Check OCI registry auth

## Future Enhancements

- [ ] Performance budgeting (Lighthouse CI)
- [ ] Visual regression testing
- [ ] Chaos engineering gates
- [ ] Progressive deployment verification
- [ ] SLO/SLI tracking

