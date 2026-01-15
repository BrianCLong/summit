# Security Gates & Verification

## Overview

This document outlines the security gates and verification procedures enforced by the Release Engineering team.

## Verification Quickstart

To verify the integrity of a release bundle locally:

```bash
# 1. Verify Structure & Checksums (Strict Policy)
# Note: Skips signature check if you don't have Cosign installed or are offline.
REQUIRE_SIGNATURE=false node scripts/release/verify-release-bundle.mjs --path dist/release --strict

# 2. Complete Verification (CI/Production)
# Requires 'cosign' and internet access to Sigstore
node scripts/release/verify-release-bundle.mjs --path dist/release --strict
```

## Gate Definitions

### 1. Evidence Drift Gate

**Enforcement**: CI Pipeline (`publish-guard` job)
**Description**: Prevents the release of artifacts that do not match the source-of-truth generation logic.
**command**: `node scripts/release/verify-release-bundle.mjs --regenerate-and-compare ...`

### 3. Dependency Audit Gate

**Enforcement**: CI Pipeline (`verify` job)
**Description**: Enforces zero unwaived Critical/High vulnerabilities in production dependencies using `pnpm audit`.
**Command**: `node scripts/ci/security_audit_gate.mjs`
**Remediation**:

1. Run `pnpm audit` locally to identify vulnerable packages.
2. Update packages if possible (`pnpm update`).
3. If no fix is available and the risk is acceptable, add a waiver to `.github/security-waivers.yml`.

### 4. Secrets Scanning Gate

**Enforcement**: CI Pipeline (`verify` job) & Pre-commit
**Description**: Prevents committing or merging secrets (API keys, tokens, etc.) into the repository.
**Command**: `./scripts/ci/scan_secrets.sh`
**Tooling**: Powered by [Gitleaks](https://github.com/gitleaks/gitleaks).
**Remediation**:

1. Remove the secret from the code.
2. If the secret was already committed, rotate the secret immediately.
3. Use `git reset HEAD <file>` to unstage the sensitive file.
