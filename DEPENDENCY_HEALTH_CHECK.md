# Dependency Health Check Report

**Date:** 2025-11-20
**Branch:** claude/dependency-health-check-01GCzSDgwRVoPwkg1XBEqox4
**Status:** 🔴 CRITICAL SECURITY VULNERABILITIES FOUND

---

## Executive Summary

This report identifies **8 security vulnerabilities** (1 critical, 5 high, 2 moderate) and multiple outdated dependencies across the Summit/IntelGraph platform. Immediate action is required to address critical security issues.

### Critical Findings

- **1 CRITICAL** vulnerability: Server-Side Request Forgery in `parse-url`
- **5 HIGH** severity vulnerabilities in various packages
- **2 MODERATE** severity vulnerabilities
- **3 DEPRECATED** packages requiring replacement
- **6 OUTDATED** packages with newer versions available

---

## Security Vulnerabilities

### 🔴 CRITICAL Severity

#### 1. parse-url - Server-Side Request Forgery (SSRF)
- **CVE:** CVE-2022-2900
- **Current Version:** 6.0.5
- **Patched Version:** ≥8.1.0
- **CVSS Score:** 9.1 (Critical)
- **Path:** `client>apollo>git-url-parse>git-up>parse-url`
- **Impact:** Allows attackers to make arbitrary requests from the server, potentially accessing internal resources
- **Recommendation:** Upgrade to 8.1.0+ immediately
- **Challenge:** Transitive dependency - requires updating parent packages

---

### 🟠 HIGH Severity

#### 2. parse-path - Authorization Bypass
- **CVE:** CVE-2022-0624
- **Current Version:** 4.0.4
- **Patched Version:** ≥5.0.0
- **CVSS Score:** 7.3 (High)
- **Path:** `client>apollo>git-url-parse>git-up>parse-url>parse-path`
- **Impact:** Authorization bypass through user-controlled keys
- **Recommendation:** Upgrade to 5.0.0+
- **Challenge:** Transitive dependency

#### 3. parse-url - URL Parsing Vulnerability
- **CVE:** CVE-2022-3224
- **Current Version:** 6.0.5
- **Patched Version:** ≥8.1.0
- **CVSS Score:** 6.1 (Moderate) + 9.1 (Critical - see above)
- **Path:** `client>apollo>git-url-parse>git-up>parse-url`
- **Impact:** Misinterpretation of HTTP/HTTPS URLs, hostname spoofing
- **Recommendation:** Same fix as CRITICAL item #1

#### 4. xlsx - Prototype Pollution
- **CVE:** CVE-2023-30533
- **Current Version:** 0.18.5
- **Patched Version:** ≥0.19.3 (NOT on npm)
- **CVSS Score:** 7.8 (High)
- **Path:** `server>node-nlp>@nlpjs/xtables>xlsx`
- **Impact:** Prototype pollution when reading specially crafted files
- **Recommendation:** ⚠️ **NO NPM FIX AVAILABLE** - Package abandoned
- **Mitigation Options:**
  1. Download from https://cdn.sheetjs.com/
  2. Replace with maintained alternative (e.g., `exceljs`)
  3. Remove dependency if not actively used

#### 5. xlsx - Regular Expression Denial of Service
- **CVE:** CVE-2024-22363
- **Current Version:** 0.18.5
- **Patched Version:** ≥0.20.2 (NOT on npm)
- **CVSS Score:** 7.5 (High)
- **Path:** `server>node-nlp>@nlpjs/xtables>xlsx`
- **Impact:** ReDoS attack vector
- **Recommendation:** Same as #4 - package abandoned

#### 6. moment - Inefficient Regular Expression Complexity
- **CVE:** CVE-2022-31129
- **Current Version:** 2.29.3
- **Patched Version:** ≥2.29.4
- **CVSS Score:** 7.5 (High)
- **Path:** `client>apollo>moment`
- **Impact:** ReDoS attack on RFC2822 date parsing with inputs >10k characters
- **Recommendation:** Upgrade to 2.29.4+ OR migrate to modern alternatives:
  - `date-fns` (functional, tree-shakeable)
  - `dayjs` (lightweight, moment-compatible API)
  - Native `Temporal` API (future standard)

#### 7. glob - Command Injection
- **CVE:** CVE-2025-64756
- **Current Version:** 11.0.3
- **Patched Version:** ≥11.1.0
- **CVSS Score:** 7.5 (High)
- **Path:** `.>markdownlint-cli>glob`
- **Impact:** Command injection via `-c/--cmd` option in CLI
- **Recommendation:** Upgrade to 11.1.0+
- **Note:** Only affects CLI usage, not library API

---

### 🟡 MODERATE Severity

#### 8. esbuild - CORS Vulnerability in Dev Server
- **CVE:** GHSA-67mh-4wv8-2f99
- **Current Version:** 0.18.20
- **Patched Version:** ≥0.25.0
- **CVSS Score:** 5.3 (Moderate)
- **Path:** `apps__web>@storybook/blocks>@storybook/docs-tools>@storybook/core-common>esbuild`
- **Impact:** Dev server allows any website to read responses (CORS misconfiguration)
- **Recommendation:** Upgrade to 0.25.0+
- **Note:** Development-only impact, but should still be addressed

---

## Outdated Dependencies

### Root Workspace

| Package | Current | Latest | Type | Priority |
|---------|---------|--------|------|----------|
| @swc/core | 1.15.2 | 1.15.3 | dev | Medium |
| @typescript-eslint/eslint-plugin | 8.46.4 | 8.47.0 | dev | Low |
| @typescript-eslint/parser | 8.46.4 | 8.47.0 | dev | Low |
| typescript-eslint | 8.46.4 | 8.47.0 | dev | Low |
| eslint-plugin-jest | 29.1.0 | 29.2.0 | dev | Low |
| markdownlint-cli | 0.45.0 | 0.46.0 | dev | Low |

### Server Workspace

**Note:** Most packages show as "missing" - suggests they're declared but not installed (likely hoisted to root)

---

## Deprecated Packages

### Requiring Migration

1. **apollo-server-express** (wanted: 3.13.0)
   - **Status:** Deprecated
   - **Replacement:** `@apollo/server` with `@as-integrations/express4`
   - **Path:** `server/`
   - **Migration Effort:** Medium
   - **Docs:** https://www.apollographql.com/docs/apollo-server/migration

2. **@types/express-rate-limit** (wanted: 6.0.2)
   - **Status:** Deprecated
   - **Replacement:** Types now bundled with `express-rate-limit`
   - **Action:** Remove `@types/express-rate-limit`, update `express-rate-limit`

3. **@types/pino-http** (wanted: 6.1.0)
   - **Status:** Deprecated
   - **Replacement:** Types now bundled with `pino-http`
   - **Action:** Remove `@types/pino-http`, ensure `pino-http` is up-to-date

4. **@types/uuid** (wanted: 11.0.0)
   - **Status:** Deprecated
   - **Replacement:** Types now bundled with `uuid` v9+
   - **Action:** Remove `@types/uuid`, update `uuid` to v11+

---

## Upgrade Plan

### Phase 1: CRITICAL - Immediate Action Required (Week 1)

**🎯 Goal:** Eliminate critical and high-severity vulnerabilities

#### 1.1 Fix parse-url / parse-path SSRF & Authorization Bypass
- **Approach:** Update transitive dependency chain
- **Commands:**
  ```bash
  # Option A: Update apollo package (if available)
  pnpm update apollo --recursive

  # Option B: Use pnpm overrides in package.json
  # Add to root package.json:
  {
    "pnpm": {
      "overrides": {
        "parse-url": "^8.1.0",
        "parse-path": "^5.0.0"
      }
    }
  }
  ```
- **Testing:** Full smoke test, verify apollo/git-url-parse functionality
- **Risk:** Low - patch-level security fixes

#### 1.2 Fix xlsx Vulnerabilities
- **Approach:** Replace with maintained alternative OR download from CDN
- **Recommended Path:** Replace with `exceljs`
- **Analysis Needed:** Verify `node-nlp` usage of xlsx
- **Commands:**
  ```bash
  # Check if node-nlp actually uses xlsx features
  grep -r "xlsx" server/node_modules/node-nlp/

  # If removable:
  pnpm remove node-nlp --filter server
  # or find alternative NLP library

  # If required:
  # Option A: Manually download xlsx 0.20.2+ from https://cdn.sheetjs.com/
  # Option B: Use pnpm overrides with vendored version
  ```
- **Testing:** Verify NLP features, integration tests
- **Risk:** Medium - requires dependency analysis

#### 1.3 Fix glob Command Injection
- **Approach:** Direct update
- **Commands:**
  ```bash
  pnpm update glob@^11.1.0 --recursive
  ```
- **Testing:** Verify markdownlint-cli functionality
- **Risk:** Low - backwards-compatible

#### 1.4 Fix moment ReDoS
- **Approach Option A (Quick):** Patch upgrade
  ```bash
  pnpm update moment@^2.29.4 --recursive
  ```
- **Approach Option B (Recommended):** Migrate to modern alternative
  ```bash
  # Replace with date-fns or dayjs
  pnpm remove moment --filter client
  pnpm add date-fns --filter client

  # Refactor code using moment -> date-fns
  ```
- **Testing:** Date parsing, formatting, locale functionality
- **Risk:** Low (patch) / Medium (migration)

---

### Phase 2: HIGH Priority - Complete Within 2 Weeks

**🎯 Goal:** Update outdated packages and replace deprecated dependencies

#### 2.1 Update Development Dependencies
```bash
# TypeScript ESLint tooling
pnpm update @typescript-eslint/eslint-plugin@^8.47.0 --filter "."
pnpm update @typescript-eslint/parser@^8.47.0 --filter "."
pnpm update typescript-eslint@^8.47.0 --filter "."

# Build tools
pnpm update @swc/core@^1.15.3 --filter "."

# Linting
pnpm update eslint-plugin-jest@^29.2.0 --filter "."
pnpm update markdownlint-cli@^0.46.0 --filter "."
```
- **Testing:** Run `pnpm lint`, `pnpm typecheck`, `pnpm build`
- **Risk:** Very Low - dev dependencies

#### 2.2 Fix esbuild CORS Vulnerability
```bash
# Update via storybook
pnpm update esbuild@^0.25.0 --recursive

# Or override
# package.json:
{
  "pnpm": {
    "overrides": {
      "esbuild": "^0.25.0"
    }
  }
}
```
- **Testing:** Verify dev server, Storybook functionality
- **Risk:** Low - dev environment only

#### 2.3 Migrate apollo-server-express
- **Follow:** https://www.apollographql.com/docs/apollo-server/migration
- **Steps:**
  1. Install `@apollo/server` and `@as-integrations/express4`
  2. Update server setup code
  3. Update middleware integration
  4. Remove `apollo-server-express`
- **Testing:** Full GraphQL API test suite
- **Risk:** Medium - core functionality

#### 2.4 Remove Deprecated Type Packages
```bash
# Remove deprecated type packages
pnpm remove @types/express-rate-limit @types/pino-http @types/uuid --filter server

# Ensure parent packages are updated
pnpm update express-rate-limit pino-http uuid --filter server
```
- **Testing:** TypeScript compilation
- **Risk:** Very Low

---

### Phase 3: MEDIUM Priority - Complete Within 1 Month

**🎯 Goal:** Comprehensive dependency modernization

#### 3.1 Audit All Transitive Dependencies
```bash
# Generate full dependency tree
pnpm list --depth=Infinity --json > dependency-tree.json

# Analyze for additional vulnerabilities
pnpm audit --recursive --json > full-audit.json
```

#### 3.2 Update All Patch/Minor Versions
```bash
# Update all patch versions (safest)
pnpm update --recursive

# Review and selectively update minor versions
pnpm outdated --recursive
```

#### 3.3 Establish Dependency Health Monitoring
- **Tool:** Dependabot (already configured?)
- **Cadence:** Weekly security scans, monthly dependency updates
- **CI Integration:** Fail on high/critical vulnerabilities

---

### Phase 4: ONGOING - Continuous Improvement

**🎯 Goal:** Maintain healthy dependency ecosystem

#### 4.1 Lock File Hygiene
- Review pnpm-lock.yaml changes in PRs
- Regenerate lock file quarterly: `pnpm install --force`

#### 4.2 Dependency Update Policy
- **Security patches:** Immediate (within 24-48 hours)
- **Minor updates:** Monthly review and batch update
- **Major updates:** Quarterly evaluation, planned migration

#### 4.3 Deprecation Monitoring
- Quarterly review of deprecated packages
- Proactive migration before EOL

---

## Testing Strategy

### For Each Phase

1. **Pre-Update Baseline**
   ```bash
   make smoke
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

2. **Apply Updates**
   - Update dependencies per phase plan
   - Review changelogs for breaking changes
   - Update code if necessary

3. **Post-Update Validation**
   ```bash
   # Clean install
   rm -rf node_modules pnpm-lock.yaml
   pnpm install

   # Golden path
   make bootstrap
   make up
   make smoke

   # Full test suite
   pnpm test
   pnpm lint
   pnpm typecheck
   pnpm build

   # E2E tests
   pnpm e2e
   ```

4. **Manual Testing**
   - Verify critical user workflows
   - Test affected features specifically (e.g., date formatting if updating moment)
   - Check dev server, Storybook, build outputs

---

## Immediate Actions (Next 24 Hours)

### Quick Wins - Safe to Implement Now

1. **Update glob** (fixes command injection, low risk)
   ```bash
   pnpm update glob@^11.1.0 --recursive
   ```

2. **Update moment** (fixes ReDoS, low risk)
   ```bash
   pnpm update moment@^2.29.4 --recursive
   ```

3. **Update dev dependencies** (no runtime impact)
   ```bash
   pnpm update @swc/core@^1.15.3 \
               @typescript-eslint/eslint-plugin@^8.47.0 \
               @typescript-eslint/parser@^8.47.0 \
               typescript-eslint@^8.47.0 \
               eslint-plugin-jest@^29.2.0 \
               markdownlint-cli@^0.46.0
   ```

4. **Add pnpm overrides** for parse-url/parse-path
   ```json
   {
     "pnpm": {
       "overrides": {
         "parse-url": "^8.1.0",
         "parse-path": "^5.0.0",
         "esbuild": "^0.25.0"
       }
     }
   }
   ```

### Requires Investigation (2-3 days)

1. **xlsx vulnerability**
   - Audit `node-nlp` usage in codebase
   - Determine if xlsx features are actually used
   - Evaluate migration to `exceljs` or alternative NLP library

2. **apollo-server-express migration**
   - Review current GraphQL server setup
   - Plan migration to `@apollo/server`
   - Estimate effort and testing scope

---

## Risk Assessment

### Low Risk (✅ Implement immediately)
- glob update (11.0.3 → 11.1.0)
- moment update (2.29.3 → 2.29.4)
- All dev dependency updates
- esbuild update via override

### Medium Risk (⚠️ Test thoroughly)
- parse-url/parse-path override
- apollo-server-express migration
- Removing deprecated @types packages

### High Risk (🔍 Requires analysis)
- xlsx vulnerability (abandoned package)
- node-nlp dependency chain

---

## Dependencies Summary

### By Status

- **Total Dependencies:** 3,843
- **Vulnerabilities:** 8 (1 critical, 5 high, 2 moderate)
- **Outdated Packages:** 6+ (root workspace)
- **Deprecated Packages:** 4
- **Abandoned Packages:** 1 (xlsx)

### By Action Required

- **Immediate Updates:** 4 packages (glob, moment, parse-url, parse-path)
- **Planned Migrations:** 2 packages (apollo-server-express, xlsx/node-nlp)
- **Cleanup:** 4 deprecated @types packages
- **Monitoring:** All transitive dependencies

---

## Success Criteria

### Phase 1 Complete When:
- ✅ Zero critical vulnerabilities
- ✅ Zero high-severity vulnerabilities
- ✅ All golden path tests pass
- ✅ No regressions in core functionality

### Phase 2 Complete When:
- ✅ All dev dependencies updated
- ✅ apollo-server-express migrated
- ✅ All deprecated packages removed
- ✅ Full test suite passes

### Phase 3 Complete When:
- ✅ <5 moderate vulnerabilities (transitive only)
- ✅ All direct dependencies on latest stable
- ✅ Dependency monitoring automated

---

## Notes & Recommendations

### General Observations

1. **Large dependency footprint** (3,843 packages) - consider auditing for unused dependencies
2. **Many "missing" packages** in workspace outputs - verify hoisting is working correctly
3. **Strong test coverage** - leverage for safe updates
4. **CI/CD enforcement** - maintain as safety net

### Best Practices Moving Forward

1. **Use `pnpm overrides`** for transitive dependency security patches
2. **Pin major versions** in package.json (`^` for minor/patch flexibility)
3. **Review lock file changes** in PRs (security vector)
4. **Automate security scanning** (Dependabot, Snyk, etc.)
5. **Quarterly dependency health checks** (make this a recurring task)
6. **Evaluate bundle size impact** when updating large dependencies

### Alternative Approaches

#### For xlsx (Abandoned Package)
1. **Vendor the fixed version** from cdn.sheetjs.com
2. **Fork and maintain** (high effort, not recommended)
3. **Replace with exceljs** (modern, maintained, similar API)
4. **Remove node-nlp** if not actively used
5. **Find alternative NLP library** without xlsx dependency

#### For moment (Maintenance Mode)
1. **Patch to 2.29.4** (quick fix, but still in maintenance mode)
2. **Migrate to date-fns** (tree-shakeable, modern)
3. **Migrate to dayjs** (moment-compatible API, smaller bundle)
4. **Wait for Temporal API** (future standard, not ready yet)

---

## Contact & Support

For questions or assistance with this upgrade plan:
- **Created by:** Claude (AI Assistant)
- **Date:** 2025-11-20
- **Session:** claude/dependency-health-check-01GCzSDgwRVoPwkg1XBEqox4

**Next Review:** 2025-12-20 (1 month)

---

## Appendix: Commands Reference

### Useful pnpm Commands

```bash
# Check for outdated dependencies
pnpm outdated --recursive

# Security audit
pnpm audit

# Update specific package
pnpm update <package>@<version>

# Update all packages (respecting ranges)
pnpm update --recursive

# Update all packages to latest (ignoring ranges)
pnpm update --latest --recursive

# List all dependencies
pnpm list --depth=Infinity

# Why is this package installed?
pnpm why <package>

# Deduplicate dependencies
pnpm dedupe
```

### Testing Commands

```bash
# Golden path
make bootstrap && make up && make smoke

# Unit tests
pnpm test

# Linting
pnpm lint

# Type checking
pnpm typecheck

# Full build
pnpm build

# E2E tests
pnpm e2e
```

---

**END OF REPORT**
