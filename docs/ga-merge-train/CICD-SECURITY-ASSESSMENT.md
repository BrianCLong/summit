# CI/CD Security Assessment -- intelgraph-platform v5.0.0

**Assessment Date:** 2026-02-26
**Scope:** All 327 GitHub Actions workflow files in `.github/workflows/`
**Platform Version:** intelgraph-platform v5.0.0 (GA candidate)
**Assessor:** Automated security analysis via Summit Agent
**Classification:** Internal -- Engineering & Security

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Workflow Security Posture](#2-workflow-security-posture)
3. [Supply Chain Security](#3-supply-chain-security)
4. [Gate Analysis](#4-gate-analysis)
5. [Vulnerability Surface](#5-vulnerability-surface)
6. [Findings Inventory](#6-findings-inventory)
7. [Recommendations](#7-recommendations)
8. [Appendices](#appendices)

---

## 1. Executive Summary

The intelgraph-platform CI/CD infrastructure comprises **327 workflow files** (including 18 reusable workflows) executing across GitHub Actions. The platform demonstrates a mature security posture with SLSA Level 3 build provenance, Sigstore keyless signing, comprehensive SAST/DAST/SCA coverage, and a multi-stage governance gate system.

However, the assessment identifies **4 critical**, **7 high**, and **9 medium** priority findings that must be addressed relative to the v5.0.0 GA release timeline.

**Key Strengths:**
- SLSA L3 provenance generation with Sigstore keyless OIDC signing
- Comprehensive security scanning pipeline (CodeQL, Semgrep, Trivy, Gitleaks, Grype, OWASP ZAP)
- OPA/Conftest policy-as-code enforcement for Kubernetes and workflow governance
- Two-person approval gate on `ga-release` environment for production publish
- Governance lockfile integrity verification with hash-based drift detection
- RC lineage verification ensuring GA tags trace to successful release candidates

**Key Risks:**
- Inconsistent action pinning: 70 unique action references use mutable tags instead of SHA digests
- 168 of 321 workflows lack explicit `permissions:` blocks (default token permissions apply)
- `pull_request_target` usage in `auto-approve-prs.yml` with auto-approval logic
- `secrets: inherit` used in 5 workflows, granting full secret access to called workflows
- Self-hosted runner definitions present without documented hardening controls

---

## 2. Workflow Security Posture

### 2.1 Permissions Model (Least Privilege Audit)

| Metric | Count | Assessment |
|--------|-------|------------|
| Workflows with explicit `permissions:` | 153 | 47.7% coverage |
| Workflows without `permissions:` block | 168 | **52.3% uncontrolled** |
| Workflows with `read-all` | 1 | `_hardening.yml` (acceptable for audit role) |
| Workflows with `contents: write` | 30 | Requires case-by-case justification |
| Workflows with `id-token: write` | ~15 | Used for OIDC auth (appropriate) |

**Analysis:**

The repository has **not set a restrictive default token permission** at the organization or repository level. This means 168 workflows without explicit `permissions:` blocks inherit the GitHub default, which historically grants `contents: write` and other elevated permissions.

**Positive patterns observed:**
- Reusable workflows (`_reusable-governance-gate.yml`, `_reusable-security-compliance.yml`) correctly scope permissions to `contents: read`
- The SLSA build workflow properly declares `contents: read`, `packages: write`, `id-token: write`, `attestations: write`
- Deployment workflows correctly use `id-token: write` for OIDC federation

**Negative patterns observed:**
- `dependency-audit.yml` requests `contents: write` + `pull-requests: write` + `security-events: write` at the workflow level rather than scoping to the `auto-fix` job that needs it
- The GA pipeline (`release-ga-pipeline.yml`) has two versions -- one grants `security-events: write` and `pull-requests: write` at the top level, while the other correctly restricts to `contents: read` + `actions: read`
- `_hardening.yml` uses `permissions: read-all` which is broader than necessary; it only needs `contents: read`

### 2.2 Secret Management Practices

**Secrets inventory** (30+ unique secret references identified):

| Category | Secrets | Risk Level |
|----------|---------|------------|
| Cloud OIDC | `AWS_OIDC_ROLE_ARN`, `AWS_ROLE_TO_ASSUME`, `AZURE_CLIENT_ID`, `GCP_WORKLOAD_POOL` | Low (OIDC-based, no long-lived credentials) |
| Legacy Cloud Keys | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | **HIGH** -- long-lived credentials |
| Database | `PG_DSN`, `PG_PASSWORD`, `PG_HOST`, `POSTGRES_URL`, `REDIS_URL` | Medium -- should use OIDC or vault |
| Signing | `SIGSTORE_KEY` | **HIGH** -- see Finding F-SEC-01 |
| Registry | `NPM_TOKEN`, `GITHUB_TOKEN` | Medium |
| Admin | `BRANCH_PROTECTION_ADMIN_TOKEN`, `BRANCH_PROTECTION_APP_PRIVATE_KEY` | **HIGH** -- elevated GitHub permissions |
| Third-Party | `SNYK_TOKEN`, `CODECOV_TOKEN`, `MOONSHOT_API_KEY` | Medium |
| Encryption | `BACKUP_ENCRYPTION_KEY` | High |

**`secrets: inherit` usage:** 5 workflows pass the full secret namespace to called workflows. This violates the principle of least privilege -- called workflows receive access to all repository secrets regardless of need.

**Positive patterns:**
- OIDC federation used for AWS (`_auth-oidc.yml`), GCP (`ci-trusted.yml`), and Azure deployments
- `aws-actions/configure-aws-credentials` configured with `mask-aws-account-id: true`
- Gitleaks secret scanning enforced on PRs and pushes

**Negative patterns:**
- `slsa-provenance.yml` uses `secrets.SIGSTORE_KEY` for `cosign sign-blob --key env://SIGSTORE_KEY`, indicating a stored signing key rather than keyless OIDC signing. This contradicts the keyless pattern used in `release-ga-pipeline.yml` and `_reusable-slsa-build.yml`
- Long-lived `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` credentials coexist with OIDC-based credentials, suggesting incomplete migration

### 2.3 Third-Party Action Pinning (SHA vs Tag)

| Pinning Strategy | Unique Refs | Percentage |
|------------------|-------------|------------|
| SHA-pinned (`@<40-char-hex>`) | 97 | **58.1%** |
| Tag/version-pinned (`@v4`, `@v3.1.1`) | 70 | **41.9%** |
| Local actions (`./`) | ~5 | N/A |

**Critical unpinned actions (high-frequency, mutable tags):**

| Action | Usage Count | Tag | Risk |
|--------|-------------|-----|------|
| `actions/checkout@v4` | 252 | Mutable | **HIGH** -- most-used action |
| `pnpm/action-setup@v4` | 142 | Mutable | HIGH |
| `actions/setup-node@v4` | 124 | Mutable | HIGH |
| `actions/upload-artifact@v4` | 80 | Mutable | HIGH |
| `actions/setup-python@v5` | 42 | Mutable | Medium |
| `actions/setup-python@v4` | 9 | Mutable | Medium |
| `aws-actions/configure-aws-credentials@v4` | 9 | Mutable | **HIGH** -- cloud auth |
| `hashicorp/setup-terraform@v3` | 8 | Mutable | Medium |
| `actions/checkout@v3` | 6 | Mutable + outdated | Medium |

**Positive patterns:**
- A `policy-pinned-actions.yml` workflow exists to enforce pinning on PR changes to workflow files
- `ci-security-preflight.yml` uses OPA to evaluate action refs against an allowlist
- `_hardening.yml` includes a `check-gha-action-pinning.sh` preflight step
- Comment-based version tracking (e.g., `@<sha> # v4`) is used in many SHA-pinned refs

**Negative patterns:**
- Enforcement is **reactive** (PR-time check) rather than preventive -- existing unpinned refs in 252+ workflow lines are not flagged
- Multiple different SHA pins exist for the same action version (e.g., `actions/checkout@v4` has at least 4 different SHA pins: `8e8c483d...`, `34e11487...`, `692973e3...`, `11bd7190...`), indicating inconsistent update practices
- Some actions use incorrect version comments (e.g., `actions/checkout@v4 # v6`, `actions/upload-artifact@b7c566a7... # v6`) -- the comment claims v6 but the SHA corresponds to v4

### 2.4 Self-Hosted Runner Risks

**Self-hosted runner usage identified:**

| Workflow | Runner Labels | Risk |
|----------|--------------|------|
| `self-hosted-runners-example.yml` | `[self-hosted, linux, x64, summit-build]`, `[self-hosted, linux, x64, summit-test]`, `[self-hosted, linux, x64, summit-deploy]`, `self-hosted` (generic) | **HIGH** |
| `test-runners.yml` | `self-hosted` | Medium |

**Risks:**
- `self-hosted-runners-example.yml` is triggered on `push` to `main`/`develop` AND `pull_request` to `main`, meaning **fork PRs could execute code on self-hosted runners** (if fork PRs are allowed)
- No `permissions:` block defined on the self-hosted runner workflow
- The `deploy` job runs on `summit-deploy` with access to production environment
- The `analyze` job uses a bare `self-hosted` label, which matches any available self-hosted runner
- No evidence of runner hardening documentation, ephemeral runner configuration, or network segmentation

---

## 3. Supply Chain Security

### 3.1 Dependency Pinning Strategy

| Package Manager | Lockfile | Frozen Install | Assessment |
|----------------|----------|----------------|------------|
| pnpm (Node.js) | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` | Good -- consistently enforced |
| pip (Python) | None observed | Partial (specific versions in some workflows) | **Weak** -- `pip install pyyaml` without version pin |
| Docker | `Dockerfile` | Partial | Medium -- `lint_dockerfile_pin.sh` exists |
| Rust (Cargo) | `Cargo.lock` | Not assessed in workflows | Unknown |

**Positive patterns:**
- `--frozen-lockfile` consistently used across Node.js workflows
- `dependency-freeze-check.yml` enforces lockfile stability during RC stabilization
- `security-supplychain.yml` verifies specific framework versions (Hono) against lockfile
- `ci_supplychain_foundation.yml` runs Dockerfile pin linting

**Negative patterns:**
- Python dependencies installed without pinning in governance workflows: `pip install pyyaml` (no version constraint)
- `checkov==3.2.23` is pinned but other pip installs are not
- No `requirements.txt` or `constraints.txt` observed for Python workflow dependencies
- Cosign version inconsistencies: `v2.2.0`, `v2.2.2`, `v2.2.3`, `v2.2.4` used across different workflows

### 3.2 SBOM Generation Capability

| SBOM Tool | Format | Workflow | Coverage |
|-----------|--------|----------|----------|
| Syft (Anchore) | SPDX-JSON, CycloneDX-JSON | `slsa-provenance.yml`, `_reusable-slsa-build.yml` | Container + filesystem |
| Anchore sbom-action | SPDX-JSON, CycloneDX-JSON | `sbom-scan.yml`, `pr-provenance-sbom.yml` | Container images |
| Grype (Anchore) | SARIF | `sbom-scan.yml` | Vulnerability scanning against SBOM |

**Assessment:** SBOM generation is well-integrated into both the SLSA build pipeline and the PR-level scanning. Both SPDX and CycloneDX formats are generated, meeting multi-standard compliance requirements. SBOM attestation via `actions/attest-sbom@v2/v3` is correctly implemented.

### 3.3 Container Image Provenance

| Control | Status | Evidence |
|---------|--------|----------|
| SLSA L3 provenance | Implemented | `_reusable-slsa-build.yml` uses `slsa-framework/slsa-github-generator@v2.1.0` |
| Keyless signing (Cosign OIDC) | Implemented | `cosign sign --yes` with OIDC identity |
| Signature verification | Implemented | `cosign verify` with `--certificate-identity` and `--certificate-oidc-issuer` pins |
| Reproducible builds | Partial | `SOURCE_DATE_EPOCH` set from git log; `provenance: mode=max` enabled |
| Build attestation | Implemented | `actions/attest-build-provenance@v3` |
| SBOM attestation | Implemented | `actions/attest-sbom@v2/v3` |
| Image digest pinning | Implemented | Images referenced by `@digest` after build |
| Registry authentication | Implemented | GHCR via `GITHUB_TOKEN` |

**Positive patterns:**
- The SLSA build workflow performs post-sign verification against expected OIDC issuer and subject
- OCI labels include `io.slsa.level=3` and `org.opencontainers.image.source`
- BuildKit version is pinned (`moby/buildkit:v0.12.4`)

**Negative patterns:**
- `pr-provenance-sbom.yml` logs into GHCR via `echo "${{ secrets.GITHUB_TOKEN }}" | docker login ... --password-stdin` in a `run:` step, which is less secure than using `docker/login-action` (token appears in process list)

### 3.4 Package Registry Security

| Registry | Auth Method | Assessment |
|----------|------------|------------|
| GHCR (ghcr.io) | `GITHUB_TOKEN` via docker/login-action | Good |
| npm | `NPM_TOKEN` secret | Medium -- ensure scoped token |
| PyPI | Not observed | N/A |

---

## 4. Gate Analysis

### 4.1 Pre-Merge Gates (PR-Level)

| Gate | Workflow | Blocking | Scope |
|------|----------|----------|-------|
| Action pinning enforcement | `policy-pinned-actions.yml` | Yes | Workflow file changes |
| Security preflight (OPA) | `ci-security-preflight.yml` | Yes | All PRs |
| Secret scanning (Gitleaks) | `secret-scan-warn.yml` | Yes | All PRs + pushes |
| Dependency audit | `dependency-audit.yml` | Conditional (threshold) | Lockfile changes |
| Dependency freeze | `dependency-freeze-check.yml` | Yes (during RC phase) | Lockfile changes |
| Schema compatibility | `schema-compatibility-check.yml` | Yes | Schema changes |
| Type safety | `type-safety-audit.yml`, `server-typecheck.yml`, `client-typecheck.yml` | Yes | Source changes |
| Lint / format | `api-lint.yml`, `ci-actionlint.yml`, `workflow-lint.yml` | Yes | Code/workflow changes |
| Unit tests | `gate.yml` (gate-check.sh) | Yes | All PRs |
| CODEOWNERS | `.github/CODEOWNERS` + `CODEOWNERS` | Enforced via branch protection | All PRs |

### 4.2 Security Scanning Gates

| Scanner | Type | Workflow | Trigger | Blocking |
|---------|------|----------|---------|----------|
| CodeQL | SAST | `ci-security.yml` | Weekly + callable | Yes |
| Semgrep | SAST | `ci-security.yml` | Weekly + callable | Yes |
| Gitleaks | Secret detection | `ci-security.yml`, `secret-scan-warn.yml` | PR + push + weekly | Yes |
| Trivy (filesystem) | SCA/Vuln | `ci-security.yml` | Weekly + callable | Yes (exit-code: 1) |
| Trivy (container) | Container scan | `ci-security.yml` | Weekly + callable | Yes (HIGH+CRITICAL) |
| Grype | SCA/Vuln | `sbom-scan.yml` | Daily + PR + push | Yes (severity-cutoff: high) |
| Snyk | SCA | `ci-security.yml` | Opt-in (requires token) | Conditional |
| Checkov | IaC scan | `ci-security.yml` | Weekly + callable | Yes |
| Conftest/OPA | Policy-as-code | `ci-security.yml` | Weekly + callable | Yes |
| OWASP ZAP | DAST | `ci-security.yml` | Weekly + callable | Conditional |
| CIS Benchmark | Compliance | `ci-security.yml` | Weekly + callable | Yes |

### 4.3 Deployment Gates

| Gate | Workflow | Environment | Mechanism |
|------|----------|-------------|-----------|
| Pre-deploy SLO check | `_deploy.yml` | Production | Script-based SLO validation |
| OIDC authentication | `_auth-oidc.yml` | All cloud envs | AWS OIDC role assumption |
| Evidence bundle verification | `deploy-ga.yml` | Production | Evidence ID consistency, governance docs, security ledger, SBOM+SLSA |
| Environment protection | `deploy-ga.yml` | `production` | GitHub environment approval rules |
| Graph sync gate | `deploy-ga.yml` | Pre-deploy | Dependent workflow gate |

### 4.4 GA Release Pipeline Gates

The `release-ga-pipeline.yml` implements a **6-stage gated pipeline**:

| Stage | Gate | Description |
|-------|------|-------------|
| 0 | Tag Classification | Excludes RC tags, validates GA tag format with anchored regex |
| 0.5 | Freeze Gate | Blocks release during error-budget exhaustion |
| 1 | RC Lineage | Verifies GA tag points to a successful RC commit |
| 2 | Verification | Release readiness checks, security guardrails, dependency audit |
| 3 | Build + Sign | Provenance manifest generation, Cosign keyless signing |
| 4 | Publish Guard | Final verification of signed bundle, cosign OIDC issuer validation |
| 5 | Bundle Assembly | SHA256SUMS integrity manifest |
| 6 | Publish | **`ga-release` environment** with two-person approval gate |

**Positive patterns:**
- Bundle integrity verified via `sha256sum -c SHA256SUMS` before publish
- Cosign signature verified against expected OIDC issuer before publish
- Two-person approval enforced via GitHub environment protection rules
- Concurrency control prevents parallel GA releases: `cancel-in-progress: false`

### 4.5 Governance Gates

| Gate | Workflow | Mechanism |
|------|----------|-----------|
| Governance lockfile integrity | `_reusable-governance-gate.yml` | SHA256 hash verification, age check, strict mode |
| Governance policy validation | `_reusable-governance-gate.yml` | Script-based policy evaluation |
| Governance health score | `_reusable-governance-gate.yml` | Composite score (0-100), CRITICAL/WARNING/OK thresholds |
| Antigravity compliance | `_reusable-security-compliance.yml` | `npm run compliance:antigravity` |
| License compliance | `_reusable-security-compliance.yml`, `ci-security.yml` | GPL/AGPL/LGPL rejection |
| Audit trail logging | `_reusable-governance-gate.yml` | Every gate decision logged with run-id and metadata |

---

## 5. Vulnerability Surface

### 5.1 Script Injection Risks

| Finding | Workflow | Severity | Detail |
|---------|----------|----------|--------|
| F-INJ-01 | `schema-diff.yml` (line 253) | **Medium** | `"pr_title": "${PR_TITLE}"` written to JSON audit log. While `PR_TITLE` is set via `env:`, the heredoc-based JSON construction could be exploited if PR titles contain `"` characters, causing JSON injection in audit logs. |
| F-INJ-02 | `agent-guardrails.yml` (lines 85, 102) | **Low** | `PR_BODY` passed as env var to Node.js scripts. Safe from shell injection but the scripts must handle untrusted input. |
| F-INJ-03 | `self-hosted-runners-example.yml` (line 68) | **Medium** | `npm run test:${{ matrix.test-suite }}` -- matrix values are author-controlled but the matrix is workflow-defined, not PR-controlled. Low actual risk but pattern is flagged. |

**Mitigating factors:**
- Most untrusted context values (`PR_BODY`, `PR_TITLE`) are passed through `env:` blocks rather than directly interpolated into `run:` scripts
- No instances of direct `${{ github.event.pull_request.title }}` interpolation within `run:` blocks detected

### 5.2 Artifact Tampering Risks

| Finding | Severity | Detail |
|---------|----------|--------|
| F-ART-01 | **Medium** | Artifacts are passed between jobs via `actions/upload-artifact` / `actions/download-artifact`. Within a single workflow run, these are tamper-resistant. However, cross-workflow artifact sharing (e.g., `deploy-ga.yml` downloading from `graph-sync-gate.yml`) depends on artifact name predictability. |
| F-ART-02 | **Low** | `geekyeggo/delete-artifact@v5` used to clean intermediate artifacts in the GA pipeline. The SHA pin (`b54d29a5...` in one version, `f275313e...` in another) is inconsistent across the two `release-ga-pipeline.yml` and `release-ga.yml` variants. |
| F-ART-03 | **Medium** | GA bundle integrity relies on `SHA256SUMS` generated within the same workflow run. An attacker who compromises the build job could regenerate valid checksums. The Cosign signature provides an additional integrity layer. |

**Mitigating factors:**
- Cosign OIDC keyless signing on provenance and release bundles
- `sha256sum -c SHA256SUMS` verification before publish
- SLSA provenance binds build artifacts to their source and builder identity

### 5.3 Token/Secret Exposure Risks

| Finding | Severity | Detail |
|---------|----------|--------|
| F-SEC-01 | **Critical** | `slsa-provenance.yml` uses `secrets.SIGSTORE_KEY` as an environment variable for `cosign sign-blob --key env://SIGSTORE_KEY`. This is a **stored signing key** rather than keyless OIDC signing, creating a single point of compromise. If this secret is leaked, all signatures made with it are forgeable. |
| F-SEC-02 | **High** | `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` references exist alongside OIDC credentials, indicating incomplete migration to short-lived credentials. |
| F-SEC-03 | **High** | `BRANCH_PROTECTION_ADMIN_TOKEN` and `BRANCH_PROTECTION_APP_PRIVATE_KEY` are admin-level GitHub credentials. Compromise of these secrets allows bypassing branch protection rules. |
| F-SEC-04 | **Medium** | `pr-provenance-sbom.yml` uses `echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io ...` in a `run:` block. While GitHub masks secrets in logs, the token is visible in the process table during execution. Use `docker/login-action` instead. |
| F-SEC-05 | **Medium** | `secrets: inherit` in 5 workflows passes all repository secrets to called workflows, including secrets not needed by those workflows. |
| F-SEC-06 | **Medium** | Database credentials (`PG_DSN`, `PG_PASSWORD`, `POSTGRES_URL`, `REDIS_URL`) stored as GitHub secrets rather than fetched at runtime from a secrets vault. |

### 5.4 `pull_request_target` Risks

| Finding | Severity | Detail |
|---------|----------|--------|
| F-PRT-01 | **Critical** | `auto-approve-prs.yml` uses `pull_request_target` trigger with auto-approval logic. While it checks `github.actor == 'BrianCLong'`, `pull_request_target` runs in the context of the **base branch**, meaning it has access to repository secrets and write permissions. If combined with any checkout of PR code, this is exploitable. The current workflow does NOT checkout PR code, so the immediate risk is limited to the actor-spoofing scenario. |
| F-PRT-02 | **Medium** | `dependency-monitor.yml` uses `pull_request_target`. Must be audited to confirm it does not check out and execute fork PR code. |

---

## 6. Findings Inventory

### Critical (4)

| ID | Title | Component |
|----|-------|-----------|
| F-SEC-01 | Stored signing key (`SIGSTORE_KEY`) instead of keyless OIDC in `slsa-provenance.yml` | Supply chain |
| F-PRT-01 | `pull_request_target` with auto-approval in `auto-approve-prs.yml` | Workflow trigger |
| F-PIN-01 | 252 instances of `actions/checkout@v4` (mutable tag) -- highest-risk unpinned action | Action pinning |
| F-PERM-01 | 168/321 workflows lack explicit `permissions:` block | Permissions |

### High (7)

| ID | Title | Component |
|----|-------|-----------|
| F-SEC-02 | Long-lived AWS credentials (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) | Secrets |
| F-SEC-03 | Admin-level GitHub tokens (`BRANCH_PROTECTION_ADMIN_TOKEN`, `BRANCH_PROTECTION_APP_PRIVATE_KEY`) | Secrets |
| F-PIN-02 | 70 unique unpinned action references across workflows | Action pinning |
| F-PIN-03 | Incorrect version comments (e.g., `@v4 # v6`) causing confusion during audits | Action pinning |
| F-RUNNER-01 | Self-hosted runners exposed to `pull_request` events without fork restrictions | Runners |
| F-SEC-05a | `secrets: inherit` in 5 workflows | Secrets |
| F-DUPL-01 | Duplicate GA pipeline workflows (`release-ga.yml` and `release-ga-pipeline.yml`) with divergent security configurations | Governance |

### Medium (9)

| ID | Title | Component |
|----|-------|-----------|
| F-SEC-04 | GITHUB_TOKEN exposed in process table via docker login in `pr-provenance-sbom.yml` | Secrets |
| F-SEC-05 | `secrets: inherit` passes unnecessary secrets to called workflows | Secrets |
| F-SEC-06 | Database credentials stored as GitHub secrets rather than vault | Secrets |
| F-DEP-01 | Python dependencies installed without version pins in workflow steps | Supply chain |
| F-DEP-02 | Cosign version inconsistency across workflows (v2.2.0 through v2.2.4) | Supply chain |
| F-INJ-01 | JSON injection risk via PR title in schema-diff audit log | Injection |
| F-ART-01 | Cross-workflow artifact trust model undocumented | Artifacts |
| F-ART-03 | SHA256SUMS self-generated within same build job | Artifacts |
| F-PRT-02 | `dependency-monitor.yml` uses `pull_request_target`, needs audit | Workflow trigger |

---

## 7. Recommendations

### 7.1 Critical -- Must-Fix Before GA

**C-1: Migrate `slsa-provenance.yml` from stored key to keyless OIDC signing** (F-SEC-01)
- Replace `cosign sign-blob --key env://SIGSTORE_KEY` with `cosign sign-blob --yes` (keyless)
- Delete the `SIGSTORE_KEY` repository secret after migration
- Verify all downstream verification uses `--certificate-identity` and `--certificate-oidc-issuer`
- The `_reusable-slsa-build.yml` and `release-ga-pipeline.yml` already demonstrate the correct pattern

**C-2: Restrict `auto-approve-prs.yml` or remove `pull_request_target` trigger** (F-PRT-01)
- Option A: Convert to `pull_request` trigger (loses access to secrets, but auto-approve needs `GITHUB_TOKEN` only)
- Option B: Add explicit conditional to verify the PR source repository matches the base repository: `github.event.pull_request.head.repo.full_name == github.repository`
- Option C: Remove the workflow entirely; auto-approval of owner PRs can be handled via branch protection bypass for administrators

**C-3: Pin all `actions/checkout@v4` references to SHA digest** (F-PIN-01)
- 252 instances of the most security-critical action are on a mutable tag
- Use the existing `scripts/security/pin-github-actions.sh` or `scripts/ci/check-gha-action-pinning.sh` to perform a bulk pin
- Standardize on a single SHA per action version and update the `check-gha-action-pinning.sh` enforcement to block PRs introducing unpinned refs for all workflow changes

**C-4: Set repository-level default token permissions to `read`** (F-PERM-01)
- Go to Settings > Actions > General > Workflow permissions
- Set to "Read repository contents and packages permissions"
- This forces all 168 workflows without `permissions:` blocks to default to read-only
- Workflows requiring elevated permissions already have explicit `permissions:` blocks

### 7.2 High Priority -- Fix Within 30 Days

**H-1: Complete OIDC migration for AWS credentials** (F-SEC-02)
- Identify all workflows referencing `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- Migrate to `aws-actions/configure-aws-credentials` with OIDC role assumption (pattern already established in `_auth-oidc.yml` and `deploy-ga.yml`)
- Delete long-lived AWS credentials from repository secrets

**H-2: Audit and scope `BRANCH_PROTECTION_ADMIN_TOKEN`** (F-SEC-03)
- Migrate to GitHub App-based authentication with minimal required permissions
- `BRANCH_PROTECTION_APP_ID` and `BRANCH_PROTECTION_APP_PRIVATE_KEY` suggest partial migration is underway -- complete it
- Use `actions/create-github-app-token@v1` (already referenced in some workflows) to generate scoped, short-lived tokens

**H-3: Pin all remaining 70 unpinned action references** (F-PIN-02)
- Prioritize cloud authentication actions (`aws-actions/configure-aws-credentials@v4`, `google-github-actions/auth@v3`)
- Prioritize actions that receive secrets (`docker/login-action@v3`, `sigstore/cosign-installer@v3`)
- Fix incorrect version comments (`@v4 # v6` should be corrected to actual version)
- Run `scripts/security/pin-github-actions.sh` across all workflow files

**H-4: Restrict self-hosted runner workflows** (F-RUNNER-01)
- Remove `pull_request` trigger from `self-hosted-runners-example.yml` or add fork PR guard
- Document runner hardening controls (ephemeral runners, network segmentation, credential isolation)
- Consider using GitHub's "Require approval for all outside collaborators" setting
- Add `permissions:` blocks to all self-hosted runner workflows

**H-5: Replace `secrets: inherit` with explicit secret passing** (F-SEC-05a)
- For each of the 5 workflows using `secrets: inherit`, identify the specific secrets needed by the called workflow
- Pass only those secrets explicitly: `secrets: { SPECIFIC_SECRET: ${{ secrets.SPECIFIC_SECRET }} }`

**H-6: Resolve duplicate GA pipeline workflows** (F-DUPL-01)
- `release-ga.yml` and `release-ga-pipeline.yml` both trigger on `push: tags: v*.*.*`
- They have divergent permission sets and different SHA pins for actions
- Consolidate to a single canonical workflow (appears `release-ga-pipeline.yml` is the intended canonical based on its comments)
- Archive or delete the redundant `release-ga.yml`

**H-7: Make pinning enforcement proactive** (F-PIN-02)
- The current `policy-pinned-actions.yml` only checks workflow file changes in PRs
- Add a scheduled workflow that scans ALL existing workflow files for unpinned refs
- Block merges if any workflow file in the PR diff contains unpinned actions (this may already be the intent of `ci-security-preflight.yml`)

### 7.3 Medium Priority -- Fix Within 90 Days

**M-1: Pin Python dependencies in workflow steps** (F-DEP-01)
- Replace `pip install pyyaml` with `pip install pyyaml==6.0.1` (or use `requirements-ci.txt`)
- Create a `requirements-ci.txt` for all Python dependencies used in CI
- Add `--require-hashes` where supported

**M-2: Standardize Cosign version across workflows** (F-DEP-02)
- Choose a single Cosign version (recommend latest stable, currently v2.2.4)
- Update all `sigstore/cosign-installer` steps to use the same version
- Pin the installer action to a single SHA

**M-3: Use `docker/login-action` instead of shell-based login** (F-SEC-04)
- Replace `echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io ...` in `pr-provenance-sbom.yml`
- Use the already-available `docker/login-action` pattern from `_reusable-slsa-build.yml`

**M-4: Migrate database credentials to runtime vault fetch** (F-SEC-06)
- Consider HashiCorp Vault, AWS Secrets Manager, or similar
- Fetch credentials at deployment time via OIDC-authenticated vault calls
- Remove static credentials from GitHub Secrets

**M-5: Sanitize PR title in schema-diff audit log** (F-INJ-01)
- Use `jq` for JSON construction instead of heredoc interpolation
- Example: `jq -n --arg title "$PR_TITLE" '{"pr_title": $title}'`

**M-6: Document cross-workflow artifact trust model** (F-ART-01)
- Specify which workflows produce artifacts consumed by other workflows
- Document the trust boundary and how integrity is maintained
- Consider artifact attestation for cross-workflow artifact sharing

**M-7: Audit `dependency-monitor.yml` for `pull_request_target` safety** (F-PRT-02)
- Confirm it does not check out PR code from forks
- If it does, apply the same mitigations as F-PRT-01

**M-8: Add `permissions:` blocks to all remaining workflows** (F-PERM-01 follow-up)
- After setting repository-level default to `read` (C-4), progressively add explicit `permissions:` blocks
- Target: 100% of workflows have explicit permissions within 90 days
- The `_hardening.yml` workflow's `check-gha-perms.sh` can be used to enforce this

**M-9: Standardize on single SHA per action version** (F-PIN-03)
- `actions/checkout@v4` has at least 4 different SHAs in use
- Pick the latest verified SHA for each action version and update all references
- This simplifies audit and update tracking

---

## Appendices

### A. Workflow Inventory Summary

| Category | Count |
|----------|-------|
| Total workflow files | 327 |
| Reusable workflows (`_reusable-*`) | 18 |
| Security-focused workflows | ~35 |
| Governance/gate workflows | ~25 |
| Release/deploy workflows | ~20 |
| CI/build/test workflows | ~30 |
| Other (monitoring, tooling, ops) | ~219 |

### B. Security Scanning Coverage Matrix

| Scanner | SAST | DAST | SCA | Secrets | IaC | License | Container | CIS |
|---------|------|------|-----|---------|-----|---------|-----------|-----|
| CodeQL | X | | | | | | | |
| Semgrep | X | | | | | | | |
| Gitleaks | | | | X | | | | |
| Trivy | | | X | X | X | X | X | X |
| Grype | | | X | | | | | |
| Snyk | | | X | | | | | |
| OWASP ZAP | | X | | | | | | |
| Checkov | | | | | X | | | |
| Conftest/OPA | | | | | X | | | |

### C. Environment Protection Rules (Expected Configuration)

| Environment | Required Reviewers | Wait Timer | Branch Policy |
|-------------|-------------------|------------|---------------|
| `ga-release` | 2 (two-person rule) | Recommended | Tags only |
| `production` | 1+ | Recommended | `main` branch |
| `production-security-gate` | 1+ | None | Post-security-scan |
| `staging` | 0 | None | `main` branch |

### D. Action Pinning Status by Vendor

| Vendor | SHA-Pinned | Tag-Pinned | Total |
|--------|-----------|------------|-------|
| actions/* (GitHub) | ~45 | ~30 | ~75 |
| pnpm/* | ~5 | ~8 | ~13 |
| docker/* | ~8 | ~5 | ~13 |
| sigstore/* | ~6 | ~6 | ~12 |
| anchore/* | ~3 | ~5 | ~8 |
| aws-actions/* | ~2 | ~3 | ~5 |
| Other | ~28 | ~13 | ~41 |

### E. References

- [SLSA Framework](https://slsa.dev/) -- Supply-chain Levels for Software Artifacts
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Sigstore Cosign](https://docs.sigstore.dev/cosign/overview/) -- Container signing and verification
- [StepSecurity harden-runner](https://github.com/step-security/harden-runner) -- Recommended for runtime security monitoring
- Summit S-AOS (CLAUDE.md) -- Project operating standard
- `docs/ci/GOVERNANCE_LOCKFILE.md` -- Governance lockfile authority document
- `docs/ci/RELEASE_GA_PIPELINE.md` -- GA pipeline documentation

---

*End of assessment. This document should be reviewed by the Security team and updated as findings are remediated.*
