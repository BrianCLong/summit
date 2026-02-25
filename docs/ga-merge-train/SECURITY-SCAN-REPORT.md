# Security Scan Report — v5.0.0-rc.1

**Date:** 2026-02-25
**Branch:** `claude/merge-prs-ga-release-XjiVk`
**Commit:** `28015eab85`

---

## Summary

| Category | Status | Details |
|----------|--------|---------|
| Security Check | PASS | `pnpm security:check` |
| Secret Detection | PASS (false positives) | `.mypy_cache` hashes flagged, not real secrets |
| Dependency Audit | 31 vulnerabilities | 2 critical, 14 high, 10 moderate, 5 low |
| XSS Audit | FIXED | 3 instances found and patched |
| Signature Verification | FIXED | HMAC-SHA256 + timingSafeEqual |
| Tenant Isolation | VERIFIED | AuthorizationService enforces tenant scoping |
| Merge Conflict Scan | CLEAN | No leftover markers in codebase |

---

## Vulnerabilities Fixed

### CRITICAL: Insecure Signature Verification (#17890)
- **File:** `server/src/integrations/inbound/service.ts`
- **Issue:** Direct string comparison (`signature !== config.secret`) instead of HMAC
- **Fix:** Replaced with `createHmac('sha256', secret)` + `timingSafeEqual()`
- **CWE:** CWE-347 (Improper Verification of Cryptographic Signature)

### HIGH: Stored XSS in IntelligentCopilot (#18063)
- **Files:** `client/src/components/ai/IntelligentCopilot.{jsx,js}`
- **Issue:** `dangerouslySetInnerHTML` with unsanitized user message content
- **Fix:** Replaced with safe React text rendering using `String.split()` + `map()`
- **CWE:** CWE-79 (Cross-site Scripting)

### HIGH: XSS in HelpArticleView
- **File:** `packages/help-overlay/src/components/HelpArticleView.tsx`
- **Issue:** `dangerouslySetInnerHTML` with server HTML without sanitization
- **Fix:** Added `sanitizeHtml()` stripping scripts, iframes, event handlers, javascript: URLs
- **CWE:** CWE-79 (Cross-site Scripting)

---

## Dependency Audit (npm)

### Critical (2)
| Package | Advisory | Impact |
|---------|----------|--------|
| micromatch | ReDoS | Denial of Service via crafted glob patterns |
| semver | ReDoS | Denial of Service via crafted version strings |

### High (14)
Notable packages: `braces`, `tar`, `tough-cookie`, `ws`, `word-wrap`, `postcss`

### Recommendation
- Run `pnpm audit fix` when npm registry is accessible
- Dependabot PRs for these packages were already included in the 13 merged dependency PRs
- Remaining vulnerabilities are in transitive dependencies

---

## Verified Security Controls

### Tenant Isolation (VERIFIED)
- `AuthorizationService.checkTenantIsolation()` runs as first authorization check
- Cross-tenant access denied with explicit error
- Role-based permissions enforce tenant scoping

### Auth Middleware (VERIFIED)
- Scope-based, role-based, and permission-based access controls
- GitHub webhook HMAC-SHA256 verification with `timingSafeEqual()`
- Production-strict secret enforcement

### CVE-2026-25145 Melange (VERIFIED)
- Version gate blocks melange < 0.40.3
- Secure tar extraction with path traversal validation
- Symlink and device file rejection

### RBAC (VERIFIED)
- Evidence search enforces RBAC and tenant isolation
- Role hierarchy: PLATFORM_ADMIN > ADMIN (tenant-scoped) > User
- Wildcard permissions with safety checks

---

## Lint/Quality Gate Status

| Linter | Errors | Warnings | Status |
|--------|--------|----------|--------|
| ESLint | 0 | 182 | PASS |
| ruff | 0 | 0 | PASS |
| mypy | 0 | 0 | PASS |
| Prettier | 0 | 0 | PASS |
| `make ga` Lint+Test | — | — | PASS |
