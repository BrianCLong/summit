# Audit CVE Exceptions - Documented Justifications

This document provides justification for CVEs that are explicitly ignored in `pnpm.auditConfig.ignoreCves`.

**Policy:** All ignored CVEs must have documented:

1. **Reason** for exclusion
2. **Mitigation** strategy (if applicable)
3. **Review date** for re-evaluation
4. **Owner** responsible for tracking

---

## CVE-2022-24434: dicer - HeaderParser Crash

**Package:** `dicer@0.3.0`
**Severity:** HIGH (CVSS 7.5)
**CWE:** CWE-248 (Uncaught Exception)
**Path:** `apollo-server-express → apollo-server-core → @apollographql/graphql-upload-8-fork → busboy → dicer`

### Status

🔴 **NO PATCH AVAILABLE** - Package maintainer has not released a fix

### Vulnerability Description

Malicious multipart form data can crash Node.js service via HeaderParser. Complete DoS achievable by sending malicious forms in a loop.

### Mitigation Strategy

**Interim Controls (Implemented):**

- ✅ Request size limits configured (`express.json({ limit: '10mb' })`)
- ✅ Rate limiting on GraphQL endpoints
- ✅ Input validation on file uploads
- ✅ Monitoring for crash patterns

**Long-term Plan:**

- 🗓️ Upgrade to Apollo Server v4 (Q1 2026)
- Apollo Server v4 uses different upload handling without dicer dependency

### Justification

- No patch exists for dicer
- Upgrade to Apollo Server v4 is a major breaking change requiring significant development effort
- Compensating controls reduce attack surface substantially
- No evidence of active exploitation in production

### Review Schedule

- **Next Review:** 2026-02-01
- **Owner:** Security Team
- **Re-evaluate:** After Apollo Server v4 upgrade completes

### References

- [CVE-2022-24434 Details](https://nvd.nist.gov/vuln/detail/CVE-2022-24434)
- [Full Mitigation Strategy](./CVE-2022-24434-MITIGATION.md)
- [GitHub Advisory GHSA-wm7h-9275-46v2](https://github.com/advisories/GHSA-wm7h-9275-46v2)

---

## CVE-2023-28155: request - SSRF via Cross-Protocol Redirect

**Package:** `request@2.88.2`
**Severity:** MODERATE (CVSS 6.1)
**CWE:** CWE-918 (Server-Side Request Forgery)
**Path:** `sdk__typescript → dtslint → @definitelytyped/utils → @qiwi/npm-registry-client → request`

### Status

❌ **DEPRECATED PACKAGE** - No longer maintained by original author

### Vulnerability Description

The deprecated `request` package allows SSRF bypass via attacker-controlled cross-protocol redirects (HTTP↔HTTPS).

### Mitigation Strategy

**Current State:**

- 📦 Transitive dependency in `sdk__typescript` (development tooling)
- 🔒 Not used in production runtime code
- 🚫 No direct control over dependency chain

**Options:**

1. **Accept risk** - Dev-only dependency, not in production
2. **Remove `sdk__typescript`** if not actively used
3. **Fork and patch** `@qiwi/npm-registry-client` to use modern alternatives (`axios`, `undici`)

### Justification

- Package is a transitive dev dependency only
- Not exposed in production runtime
- Risk limited to development/build environment
- Cost of forking/patching exceeds risk for dev-only tool
- TypeScript SDK generation may not be actively used

### Action Items

- [ ] **Audit:** Verify `sdk__typescript` is actively used
- [ ] **If unused:** Remove entire dependency chain
- [ ] **If used:** Evaluate modern alternatives to dtslint
- [ ] **Document:** Usage and necessity of this toolchain

### Review Schedule

- **Next Review:** 2026-03-01
- **Owner:** Engineering Team
- **Action:** Determine if sdk\_\_typescript is still needed

### References

- [CVE-2023-28155 Details](https://nvd.nist.gov/vuln/detail/CVE-2023-28155)
- [GitHub Advisory GHSA-p8p7-x288-28g6](https://github.com/advisories/GHSA-p8p7-x288-28g6)
- [request Deprecation Notice](https://github.com/request/request/issues/3142)

---

## CVE-2024-22363: xlsx - ReDoS

**Package:** `xlsx`
**Severity:** HIGH (ReDoS)

### Status

✅ **FALSE POSITIVE / PATCHED**

### Vulnerability Description

SheetJS Community Edition before 0.20.2 is vulnerable to Regular Expression Denial of Service (ReDoS) via crafted input triggering excessive backtracking.

### Justification

- **Vulnerable Versions:** < 0.20.2
- **Current Version:** `xlsx@0.20.3` (via CDN override in `package.json`)
- **Reason for Exclusion:** The project overrides the `xlsx` dependency to a specific tarball URL (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) which contains the fix. The CVE scanner likely flags it due to the non-standard version resolution or database lag. The vulnerability is patched in our environment.

### Review Schedule

- **Next Review:** 2026-04-18
- **Owner:** Security Team

---

## CVE-2023-30533: xlsx - Prototype Pollution

**Package:** `xlsx`
**Severity:** HIGH (CVSS 7.8)

### Status

✅ **FALSE POSITIVE / PATCHED**

### Vulnerability Description

SheetJS Community Edition before 0.19.3 is vulnerable to Prototype Pollution when reading specially crafted files, potentially leading to DoS or remote code execution.

### Justification

- **Vulnerable Versions:** < 0.19.3
- **Current Version:** `xlsx@0.20.3` (via CDN override in `package.json`)
- **Reason for Exclusion:** The project uses version 0.20.3, which supersedes the fixed version (0.19.3). This is a false positive due to the same version resolution ambiguity as CVE-2024-22363.

### Review Schedule

- **Next Review:** 2026-04-18
- **Owner:** Security Team

---

## Review Process

### Monthly Review

On the 1st of each month, the Security Team must:

1. **Re-run audits:** `pnpm audit` to check if patches are now available
2. **Check advisories:** Review GitHub Security Advisories for updates
3. **Validate mitigations:** Ensure compensating controls are still effective
4. **Update documentation:** Revise this file with current status

### Escalation Criteria

Remove CVE from ignore list and escalate if:

- ✅ Patch becomes available
- ✅ Severity is upgraded to CRITICAL
- ✅ Active exploitation is observed in the wild
- ✅ Compensating controls fail or are removed
- ✅ Regulatory/compliance requirement mandates upgrade

---

## Metrics

**Total Ignored CVEs:** 4
**Documented:** 4 (100%)
**Pending Documentation:** 0 (0%)

**By Severity:**

- CRITICAL: 0
- HIGH: 3 (CVE-2022-24434, CVE-2024-22363, CVE-2023-30533)
- MODERATE: 1 (CVE-2023-28155)
- LOW: 0

**Action Required:** Monitor Apollo Server v4 upgrade path.

---

**Last Updated:** 2026-01-18
**Next Audit:** 2026-02-01
**Owner:** Security Remediation Team
