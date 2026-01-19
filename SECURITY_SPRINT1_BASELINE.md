# Security Sprint 1 - Baseline Inventory

**Date**: 2026-01-19
**Branch**: `claude/document-summit-architecture-aZJp3`
**Mission**: Execute Security Sprint 1 - Eliminate/triage dependency vulnerabilities and code scanning alerts

---

## Baseline Status Summary

### 1. Build Health

| Check      | Status  | Details                                                                     |
| ---------- | ------- | --------------------------------------------------------------------------- |
| Lint       | ✅ PASS | ESLint + Ruff passing (warning: .eslintignore deprecated)                   |
| TypeCheck  | ❌ FAIL | Missing type definitions: @types/hapi**catbox, @types/hapi**shot (repeated) |
| Quick Test | ✅ PASS | Sanity check passes                                                         |

**Action Required**: Fix TypeScript configuration to resolve missing type definitions.

---

### 2. Dependency Audit Status

#### Ignored CVEs (from package.json)

Current audit configuration ignores 4 CVEs:

```json
{
  "ignoreCves": [
    "CVE-2024-22363", // [Justification needed]
    "CVE-2023-30533", // [Justification needed]
    "CVE-2022-24434", // HIGH - dicer via apollo-server-express - documented in SECURITY.md
    "CVE-2023-28155" // [Justification needed]
  ]
}
```

**Notes**:

- CVE-2022-24434 has documented mitigation in docs/security/CVE-2022-24434-MITIGATION.md
- Other CVEs lack documentation per SECURITY.md line 186-187

#### Deprecated Packages (5)

| Package               | Current | Latest     | Risk Level | Replacement Plan                |
| --------------------- | ------- | ---------- | ---------- | ------------------------------- |
| apollo-server-express | 3.13.0  | Deprecated | HIGH       | Migrate to Apollo Server v4     |
| @types/hapi\_\_catbox | 12.1.0  | Deprecated | LOW        | Remove if unused                |
| @types/hapi\_\_shot   | 6.0.0   | Deprecated | LOW        | Remove if unused                |
| @types/minimatch      | 6.0.0   | Deprecated | LOW        | Use built-in types if available |
| @types/uuid           | 11.0.0  | Deprecated | LOW        | Use built-in types from uuid@13 |

**Critical**: apollo-server-express is deprecated and has known vulnerability CVE-2022-24434. Migration to Apollo Server v4 is planned for Q1 2026 per SECURITY.md.

#### Outdated Packages (~20)

Major version bumps needed:

- `@commitlint/cli`: 19.8.1 → 20.3.1
- `@commitlint/config-conventional`: 19.8.1 → 20.3.1
- `@semantic-release/github`: 11.0.6 → 12.0.2

Minor/patch updates available for:

- TypeScript ESLint packages: 8.50.1 → 8.53.0
- Runtime deps: pino, pg, ioredis, zod (all minor versions)
- Dev deps: prettier, vitest, etc.

**Risk Assessment**: Most are low-risk patch/minor updates. Major version bumps require testing.

---

### 3. Code Scanning Configuration

#### Enabled Scanners

| Scanner  | Language/Scope       | Workflow                        | Status  |
| -------- | -------------------- | ------------------------------- | ------- |
| CodeQL   | JS/TS, Python, Go    | `.github/workflows/codeql.yml`  | ✅ Live |
| Semgrep  | Multi-language SAST  | `ci-security.yml`               | ✅ Live |
| Gitleaks | Secret scanning      | `ci-security.yml`               | ✅ Live |
| Snyk     | Dependency scan      | `ci-security.yml` (opt-in)      | ⚠️ OFF  |
| Trivy    | Container/filesystem | Mentioned in SECURITY.md        | ⚠️ TBD  |
| ZAP      | DAST                 | `ci-security.yml`, script ready | ⚠️ TBD  |

**Notes**:

- CodeQL runs on: push to main, PRs, weekly schedule
- Semgrep uses `p/ci` ruleset, uploads SARIF to GitHub Security
- Gitleaks v2 action with automatic SARIF upload
- Snyk disabled by default (requires token)

#### Known Alert Inventory

**Unable to retrieve via CLI** (gh command not available in environment). Recommend running:

```bash
gh api repos/BrianCLong/summit/dependabot/alerts --jq '.[] | "\(.state)|\(.security_advisory.severity)|\(.security_advisory.cve_id)|\(.dependency.package.name)"'
gh api repos/BrianCLong/summit/code-scanning/alerts --jq '.[] | "\(.state)|\(.rule.severity)|\(.rule.id)|\(.tool.name)"'
```

**From user prompt**: Expected ~5,000 code scanning alerts and 253 Dependabot vulnerabilities.

---

### 4. Security Tooling Infrastructure

#### Existing Scripts (scripts/security/)

- ✅ `baseline-check.sh` - Validates security posture
- ✅ `api-key-check.sh` - Secret scanning
- ✅ `custom-secrets-check.sh` - Additional secret patterns
- ✅ `detect_secrets.cjs` - Node.js secret detection
- ✅ `drift-check.ts` - Configuration drift detection
- ✅ `trivy-scan.sh` - Container vulnerability scanning
- ✅ `zap-scan.sh` - DAST scanning

#### Existing Workflows

- ✅ `.github/workflows/ci-security.yml` - Main security suite
- ✅ `.github/workflows/codeql.yml` - Dedicated CodeQL analysis
- ✅ `.github/workflows/dependency-audit.yml` - Automated pnpm audit
- ✅ `.github/audit-allowlist.json` - Audit exception registry

#### Missing Components

❌ **CI gate to fail on new Critical/High vulnerabilities**
❌ **Automated triage documentation (scripts/security/triage.md)**
❌ **Scanner delta reporting (before/after comparison)**
❌ **Security metrics dashboard/reporting**

---

## Sprint 1 Acceptance Criteria

### Must Have (P0)

- [ ] 0 Critical Dependabot vulnerabilities (or documented exceptions)
- [ ] 0 High Dependabot vulnerabilities (or documented exceptions)
- [ ] TypeScript type errors resolved (build passes)
- [ ] Deprecated packages documented with migration plans
- [ ] CI fails on new Critical/High dependency vulnerabilities

### Should Have (P1)

- [ ] Code scanning alerts reduced by 50%+
- [ ] All suppressions narrowly scoped with justification
- [ ] Scanner delta reporting in CI artifacts
- [ ] Security triage documentation created

### Nice to Have (P2)

- [ ] Medium Dependabot vulnerabilities triaged
- [ ] Security metrics automation
- [ ] Automated remediation PRs for safe upgrades

---

## Proposed PR Breakdown

### PR-1: Security Tooling Foundation

**Scope**: Improve CI security gates and triage workflows
**Files**:

- `.github/workflows/ci-security.yml` - Add failure thresholds
- `.github/workflows/dependency-audit.yml` - Enhance reporting
- `scripts/security/triage.md` - New triage documentation
- `scripts/security/scanner-delta.sh` - New delta reporting script

**Tests**: Verify workflow runs successfully, gates trigger correctly

---

### PR-2: TypeScript Configuration Fix

**Scope**: Resolve type definition errors blocking build
**Files**:

- `package.json` - Fix @types dependencies
- `tsconfig.json` - Adjust type resolution if needed
- Various `tsconfig.json` files in workspaces

**Tests**: `pnpm typecheck` passes, no type errors

---

### PR-3: Safe Dependency Updates (Patch/Minor)

**Scope**: Update low-risk dependencies (patch/minor versions)
**Packages** (~15):

- @types/node, body-parser, eventemitter3, vitest, zustand
- TypeScript ESLint packages
- pino, pg, ioredis, prettier, supertest

**Tests**: Full test suite passes, no regressions

---

### PR-4: Deprecated Package Documentation

**Scope**: Document deprecated packages and migration plans
**Files**:

- `docs/security/DEPRECATED_PACKAGES.md` - New migration guide
- `.github/SECURITY.md` - Update with deprecation status
- Link to Apollo Server v4 migration plan

**Tests**: N/A (documentation only)

---

### PR-5: Major Dependency Updates (Commitlint, Semantic Release)

**Scope**: Update major version dependencies
**Packages**:

- @commitlint/\* (19 → 20)
- @semantic-release/github (11 → 12)

**Tests**: Verify commitlint and semantic-release still work

---

### PR-6: CVE Justification Documentation

**Scope**: Document all ignored CVEs
**Files**:

- `docs/security/CVE-2024-22363-JUSTIFICATION.md`
- `docs/security/CVE-2023-30533-JUSTIFICATION.md`
- `docs/security/CVE-2023-28155-JUSTIFICATION.md`
- `.github/SECURITY.md` - Update audit exceptions table

**Tests**: Verify links in SECURITY.md

---

### PR-7+: Code Scanning Alert Remediation

**Scope**: Fix code scanning alerts in batches by category
**Strategy**:

1. Group alerts by rule/pattern (e.g., all XSS, all SQL injection)
2. Fix real vulnerabilities first
3. Add narrow suppressions for false positives with justification
4. One PR per major category

**Tests**: Add security tests proving vulnerabilities are fixed

---

## Next Actions

1. ✅ Complete baseline inventory
2. ⏭️ Implement PR-1: Security tooling foundation
3. ⏭️ Implement PR-2: TypeScript fix
4. ⏭️ Execute remaining PRs in sequence

---

## Notes

- All PRs will be on branch: `security/<topic>-<date>`
- Each PR includes: tests (or rationale), updated lockfiles, Security Impact note
- No mega-PRs - keep changes atomic and reviewable
- Build must remain green at all times
