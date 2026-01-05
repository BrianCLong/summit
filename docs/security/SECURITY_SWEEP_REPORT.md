# Security Sweep Report - BrianCLong/summit

**Date:** 2026-01-02
**Repository:** BrianCLong/summit
**Branch:** claude/fix-security-alerts-IZXNl
**Security Agent:** Claude Code Security Remediation Agent

---

## Executive Summary

This report documents a comprehensive security sweep of the summit repository, identifying vulnerabilities across:

- **Dependency vulnerabilities** (npm/pnpm, Cargo, Go modules)
- **GitHub Actions supply chain** (unpinned actions)
- **Code scanning findings** (SAST/CodeQL)
- **Secret scanning findings**
- **Security policy gaps**

### Current Risk Profile

| Category               | Critical | High | Moderate | Low | Total |
| ---------------------- | -------- | ---- | -------- | --- | ----- |
| **Dependencies (npm)** | 1        | 3    | 2        | 0   | 6     |
| **GitHub Actions**     | 496+     | -    | -        | -   | 496+  |
| **Cargo dependencies** | TBD      | TBD  | TBD      | TBD | TBD   |
| **Go modules**         | TBD      | TBD  | TBD      | TBD | TBD   |
| **Code scanning**      | TBD      | TBD  | TBD      | TBD | TBD   |
| **Secret scanning**    | TBD      | TBD  | TBD      | TBD | TBD   |

---

## 1. Dependency Vulnerabilities (npm/pnpm)

### 1.1 Critical Severity

#### CVE-2025-7783: form-data - Predictable Random Boundary

- **Package:** `form-data`
- **Current Version:** 2.3.3
- **Fixed Version:** ≥2.5.4
- **CVSS:** N/A (GHSA assessment: Critical)
- **CWE:** CWE-330 (Use of Insufficiently Random Values)
- **Impact:** Attacker can predict multipart form boundaries using Math.random() state, inject additional parameters, bypass SSRF protections, make arbitrary requests to internal systems
- **Paths:**
  - `sdk__typescript>dtslint>@definitelytyped/utils>@qiwi/npm-registry-client>request>form-data`
- **Remediation:** Upgrade to form-data@2.5.4 or later
- **Status:** 🔴 OPEN

### 1.2 High Severity

#### CVE-2022-24434: dicer - Crash in HeaderParser

- **Package:** `dicer`
- **Current Version:** 0.3.0
- **Fixed Version:** None (no patch available)
- **CVSS:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **CWE:** CWE-248 (Uncaught Exception)
- **Impact:** Complete denial of service via malicious form submission causing Node.js crash
- **Paths:**
  - `server>apollo-server-testing>apollo-server-core>@apollographql/graphql-upload-8-fork>busboy>dicer`
- **Remediation:**
  - Replace `apollo-server-express@3.13.0` with newer Apollo Server v4 (uses different upload handling)
  - OR implement input validation/sanitization on form uploads
  - OR remove file upload functionality if unused
- **Status:** 🔴 OPEN (requires mitigation strategy)

#### CVE-2025-15284: qs - arrayLimit Bypass DoS

- **Package:** `qs`
- **Current Versions:** 6.5.3, 6.14.0
- **Fixed Version:** ≥6.14.1
- **CVSS:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **CWE:** CWE-20 (Improper Input Validation)
- **Impact:** Memory exhaustion DoS via bracket notation bypassing arrayLimit protection
- **Paths:**
  - `.>body-parser>qs` (6.14.0)
  - `apps__server>node-vault>postman-request>qs` (6.5.3)
- **Remediation:** Upgrade to qs@6.14.1
- **Note:** CVE-2024-22363 and CVE-2023-30533 are in `pnpm.auditConfig.ignoreCves` - verify these are acceptable risks
- **Status:** 🔴 OPEN

### 1.3 Moderate Severity

#### CVE-2023-28155: request - SSRF via Cross-Protocol Redirect

- **Package:** `request` (deprecated)
- **Current Version:** 2.88.2
- **Fixed Version:** None (unmaintained)
- **CVSS:** 6.1 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N)
- **CWE:** CWE-918 (Server-Side Request Forgery)
- **Impact:** SSRF bypass via attacker-controlled cross-protocol redirects
- **Paths:**
  - `sdk__typescript>dtslint>@definitelytyped/utils>@qiwi/npm-registry-client>request`
- **Remediation:**
  - Replace `request` with maintained alternative (`node-fetch`, `axios`, `undici`)
  - OR remove unused dependency chain
- **Status:** 🔴 OPEN

#### CVE-2023-26136: tough-cookie - Prototype Pollution

- **Package:** `tough-cookie`
- **Current Version:** 2.5.0
- **Fixed Version:** ≥4.1.3
- **CVSS:** 6.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N)
- **CWE:** CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)
- **Impact:** Prototype pollution in CookieJar when `rejectPublicSuffixes=false`
- **Paths:**
  - `sdk__typescript>dtslint>@definitelytyped/utils>@qiwi/npm-registry-client>request>tough-cookie`
- **Remediation:** Upgrade to tough-cookie@4.1.3 or later
- **Status:** 🔴 OPEN

---

## 2. GitHub Actions Supply Chain (Unpinned Actions)

### 2.1 Summary

- **Total unpinned actions:** 496 instances
- **Affected workflows:** 79 files
- **Unique unpinned actions:** 54

### 2.2 Most Critical Violations

#### 🚨 IMMEDIATE RISK: Branch References

**aquasecurity/trivy-action@master** (2 instances)

- `/home/user/summit/.github/workflows/docker-build.yml:77`
- `/home/user/summit/.github/workflows/golden-path/_golden-path-pipeline.yml:291`
- **Risk:** Unpredictable, potentially malicious code execution
- **Remediation:** Pin to latest commit SHA from `master` branch

### 2.3 High-Volume Unpinned Actions

| Action                          | Count | Risk     | Recommended Version  |
| ------------------------------- | ----- | -------- | -------------------- |
| actions/checkout@v4             | 129   | CRITICAL | Pin to latest v4 SHA |
| actions/setup-node@v4           | 89    | HIGH     | Pin to latest v4 SHA |
| actions/upload-artifact@v4      | 67    | HIGH     | Pin to latest v4 SHA |
| pnpm/action-setup@v4            | 62    | HIGH     | Pin to latest v4 SHA |
| actions/download-artifact@v4    | 25    | MEDIUM   | Pin to latest v4 SHA |
| github/codeql-action/init@v4    | 5     | CRITICAL | Pin to latest v4 SHA |
| github/codeql-action/analyze@v4 | 4     | CRITICAL | Pin to latest v4 SHA |
| docker/build-push-action@v5     | 5     | CRITICAL | Pin to latest v5 SHA |
| docker/build-push-action@v6     | 2     | CRITICAL | Pin to latest v6 SHA |

### 2.4 Version Inconsistencies

Multiple versions of the same action used across workflows:

- **pnpm/action-setup:** v2, v3, v4
- **docker/build-push-action:** v5, v6
- **github/codeql-action:** v3, v4
- **actions/setup-go:** v4, v5

**Risk:** Supply chain confusion, version drift, inconsistent security posture

### 2.5 Exemplary Workflows (100% Pinned)

These workflows demonstrate correct pinning and can serve as templates:

- `/home/user/summit/.github/workflows/ga-release.yml`
- `/home/user/summit/.github/workflows/ga-risk-gate.yml`

---

## 3. Rust Dependencies (cargo audit)

**Status:** 🟡 IN PROGRESS
**Tool:** cargo-audit installation in progress

---

## 4. Go Module Dependencies

**Status:** ⚪ PENDING
**Next Step:** Run `go list -m all && govulncheck ./...` across all Go modules

---

## 5. Code Scanning Alerts (CodeQL/SAST)

**Status:** ⚪ PENDING
**Tools Present:**

- CodeQL (configured in `ci-security.yml` for JavaScript, Python)
- Semgrep (configured with `p/ci` ruleset)
- Trivy filesystem/container scanning
- Checkov (IaC scanning)

**Discovery Method:** GitHub API access not available; will trigger workflow and analyze SARIF outputs

---

## 6. Secret Scanning

**Status:** ⚪ PENDING

**Existing Controls:**

- `.gitleaks.toml` configured with allowlists for test files
- `secret-scan-warn.yml` workflow (Gitleaks - warn-only mode)
- `ci-security.yml` includes Gitleaks with SARIF upload

**Next Steps:**

1. Run Gitleaks locally: `gitleaks detect --source . --report-format json`
2. Review baseline exclusions in `.gitleaks.toml`
3. Verify no secrets in git history
4. Switch from warn-only to blocking mode

---

## 7. Security Policy & Governance

### 7.1 Current State

**`.github/SECURITY.md`** (6 lines - minimal):

```markdown
# Security Policy

- Report vulnerabilities via [SECURITY.md contact or platform].
- Do not file public issues for vulnerabilities.
- Supported branches: main
```

### 7.2 Gaps Identified

- ❌ No specific reporting channels (email, security@ address, HackerOne, etc.)
- ❌ No disclosure timeline/SLA
- ❌ No supported version matrix
- ❌ No patch release cadence
- ❌ No severity classification guidance
- ❌ No acknowledgment/credit policy
- ❌ No PGP key for encrypted reports

### 7.3 Required Improvements

Expand to GA-grade policy with:

1. Specific reporting channels (email, form, responsible disclosure platform)
2. Response SLA (e.g., "acknowledge within 48h, triage within 5 business days")
3. Supported versions table
4. Disclosure process and timeline
5. Severity scoring criteria
6. Credit policy for security researchers
7. Safe harbor language
8. PGP key for encrypted submissions (if applicable)

---

## 8. Existing Security Infrastructure (Strengths)

### 8.1 CI/CD Security

**Strong foundation already in place:**

✅ **Dependabot configured** (`.github/dependabot.yml`)

- npm, github-actions, gomod, cargo ecosystems
- Weekly update schedule
- Grouped minor/patch updates

✅ **Comprehensive security workflow** (`ci-security.yml`)

- Secret scanning (Gitleaks → SARIF)
- SAST (CodeQL for JS/Python)
- Semgrep policy-as-code
- Dependency scanning (Snyk - optional)
- Filesystem scanning (Trivy)
- Container scanning (Trivy)
- License compliance (Trivy)
- IaC scanning (Checkov)
- OPA/Conftest policy enforcement
- CIS benchmark validation
- DAST (OWASP ZAP - optional)

✅ **SBOM generation** (`sbom-scan.yml`)

- CycloneDX format
- Anchore scan with critical severity cutoff

✅ **SLSA provenance** (`slsa-provenance.yml` referenced)

✅ **Supply chain integrity checks** (multiple workflows)

### 8.2 Governance & Compliance

✅ Governance checking scripts in place
✅ Compliance verification automation
✅ Evidence generation for audits
✅ Living document verification

---

## 9. Remediation Plan

### Phase 1: Dependency Vulnerabilities (IMMEDIATE - Days 1-2)

**Priority 1: Fix patchable vulnerabilities**

1. **qs** (HIGH) → Upgrade to 6.14.1
   - Update in `package.json` overrides
   - Run `pnpm update qs`
   - Verify with `pnpm audit`

2. **form-data** (CRITICAL) → Upgrade to 2.5.4
   - Add to `pnpm.overrides` if needed
   - Run `pnpm update form-data`
   - Test multipart form functionality

3. **tough-cookie** (MODERATE) → Upgrade to 4.1.3
   - Update via dependency chain
   - Verify cookie handling still works

**Priority 2: Mitigate unpatchable vulnerabilities**

4. **dicer** (HIGH) - No patch available
   - **Option A:** Upgrade `apollo-server-express@3.13.0` → Apollo Server v4 (recommended)
   - **Option B:** Add input validation/rate limiting on upload endpoints
   - **Option C:** Disable file uploads if unused
   - Document mitigation strategy

5. **request** (MODERATE) - Deprecated package
   - Identify usage in `sdk__typescript` dependency chain
   - Replace with maintained alternative or remove if dev-only

### Phase 2: GitHub Actions Pinning (HIGH PRIORITY - Days 2-4)

**Strategy: Pin all actions to commit SHAs**

1. **Immediate:** Fix `aquasecurity/trivy-action@master` (2 instances)
2. **Batch 1:** Pin top 10 most-used actions (covers 448/496 instances)
3. **Batch 2:** Pin remaining 44 actions

**Automation approach:**

- Create script to fetch latest commit SHA for each action@version
- Generate find/replace commands or automated PR
- Use `ga-release.yml` and `ga-risk-gate.yml` as templates

### Phase 3: Rust & Go Dependencies (Days 3-5)

1. Complete `cargo audit` across all Cargo.toml files
2. Run `govulncheck` across all go.mod files
3. Fix/mitigate all findings
4. Add to CI enforcement

### Phase 4: Code Scanning & Secrets (Days 4-6)

1. Trigger security workflow and download SARIF results
2. Triage CodeQL/Semgrep findings
3. Run Gitleaks and verify no secrets in history
4. Switch secret scanning from warn-only to blocking
5. Fix any true positive findings

### Phase 5: Policy & Documentation (Days 5-7)

1. Expand `.github/SECURITY.md` to GA-grade
2. Create `docs/security/SECURITY_POSTURE.md`
3. Add `scripts/security-verify.sh` with all checks
4. Create CI gate job that blocks on security failures

### Phase 6: Verification (Day 7)

1. Run `pnpm audit` - expect 0 vulnerabilities
2. Run `cargo audit` - expect 0 vulnerabilities
3. Run `govulncheck` - expect 0 vulnerabilities
4. Verify all workflows use pinned actions
5. Run security workflow - expect all jobs green
6. Run `scripts/security-verify.sh` - expect pass

---

## 10. Evidence & Verification Commands

### Dependency Audits

```bash
# npm/pnpm
pnpm audit --json > docs/security/audit-npm-before.json
pnpm audit  # human-readable

# Rust
cargo audit --json > docs/security/audit-rust-before.json

# Go
cd <go-module-dir> && govulncheck -json ./... > ../../docs/security/audit-go-before.json
```

### GitHub Actions Pinning Check

```bash
# Find all unpinned actions
grep -r "uses:.*@v[0-9]" .github/workflows/ | grep -v "^#" | wc -l

# Find branch references (worst)
grep -r "uses:.*@master\|uses:.*@main" .github/workflows/ | grep -v "^#"
```

### Secret Scanning

```bash
# Run Gitleaks
gitleaks detect --source . --report-format sarif --report-path docs/security/gitleaks.sarif

# Check for secrets in history
gitleaks detect --source . --log-opts="--all" --report-format json
```

### Security Workflow Execution

```bash
# Trigger security workflow (requires gh CLI or API)
gh workflow run ci-security.yml

# Download SARIF results
gh run download <run-id> --name security-reports --dir docs/security/sarif/
```

---

## 11. Tracking & Status

**Last Updated:** 2026-01-02 (Initial discovery phase)

**Next Update:** After Phase 1 completion (dependency fixes)

**Responsible:** Claude Code Security Agent on branch `claude/fix-security-alerts-IZXNl`

**Commit Strategy:**

- Atomic commits per vulnerability/category
- Descriptive commit messages with CVE/GHSA references
- Single PR with all fixes, or separate PRs per phase (TBD with maintainer)

---

## 12. Notes & Observations

1. **Strong foundation:** Repository already has excellent security infrastructure in place (CodeQL, Gitleaks, SBOM, provenance, compliance automation)

2. **CVE audit exceptions:** `pnpm.auditConfig.ignoreCves` contains:
   - `CVE-2024-22363`
   - `CVE-2023-30533`
   - **Action Required:** Verify these are documented accepted risks with compensating controls

3. **Monorepo complexity:** 7,413 npm dependencies across multiple workspaces requires careful testing of upgrades

4. **Workflow volume:** 63 workflow files - pinning will be significant effort but critical for supply chain security

5. **No GitHub API/token access:** Cannot enumerate Dependabot/code-scanning/secret-scanning alerts via API; relying on local scans and workflow execution

---

## Appendix A: Command Reference

```bash
# Reproduce this audit
git checkout claude/fix-security-alerts-IZXNl

# Dependency audits
pnpm audit --json
cargo audit (after cargo install cargo-audit)
go list -m all && govulncheck ./...

# Find unpinned actions
grep -rn "uses:.*@v[0-9]" .github/workflows/ | grep -v "^#" | wc -l

# Secret scanning
gitleaks detect --source . --config .gitleaks.toml

# Run security workflow
gh workflow run ci-security.yml
```

---

**End of Report**
