# Ignored CVEs - Risk Assessment & Justification

**Date:** January 18, 2026
**Review Cycle:** Quarterly (every 90 days)
**Last Reviewed:** January 18, 2026

## Overview

This document provides a comprehensive assessment of CVEs that are currently ignored in the summit repository's pnpm audit configuration. Each ignored CVE is evaluated for risk, impact, and justification for continued ignoring.

## CVE Evaluation Framework

For each ignored CVE, we assess:

1. **Affected Package** - Which dependency contains the vulnerability?
2. **Vulnerability Type** - What is the nature of the vulnerability?
3. **CVSS Score** - How severe is the vulnerability?
4. **Exploitability** - How easy is it to exploit?
5. **Impact in Context** - Can this be exploited in our codebase?
6. **Justification** - Why are we ignoring this CVE?
7. **Expiration Date** - When should this be re-evaluated?
8. **Mitigation** - What controls are in place?

---

## CVE-2024-22363

### Vulnerability Details

| Field | Value |
|-------|-------|
| **CVE ID** | CVE-2024-22363 |
| **Affected Package** | `xlsx` |
| **Vulnerability Type** | Regular Expression Denial of Service (ReDoS) |
| **CVSS Score** | HIGH |
| **Published Date** | 2024 |
| **Status** | Ignored (False Positive) |

### Assessment

**Affected Package:** `xlsx`

**Risk Analysis:**

- **Exploitability:** Low in current environment.
- **Impact:** High (Potential DoS).
- **Affected Code Paths:** Code parsing Excel files.
- **Likelihood of Exploitation:** N/A (Patched).

### Justification

**False Positive / Patched:**
The vulnerability exists in SheetJS Community Edition versions before 0.20.2. This project uses `xlsx@0.20.3` via a direct tarball URL override in `package.json` (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`). The CVE scanner flags this due to non-standard version resolution, but the vulnerability is patched in the used version.

### Mitigation Controls

- **Version Override:** Explicitly pinned to 0.20.3 via CDN.

### Re-evaluation Date

**Next Review:** 2026-04-18

---

## CVE-2023-30533

### Vulnerability Details

| Field | Value |
|-------|-------|
| **CVE ID** | CVE-2023-30533 |
| **Affected Package** | `xlsx` |
| **Vulnerability Type** | Prototype Pollution |
| **CVSS Score** | 7.8 (HIGH) |
| **Published Date** | 2023 |
| **Status** | Ignored (False Positive) |

### Assessment

**Affected Package:** `xlsx`

**Risk Analysis:**

- **Exploitability:** Low in current environment.
- **Impact:** High (RCE/DoS potential).
- **Affected Code Paths:** Code parsing malicious Excel files.
- **Likelihood of Exploitation:** N/A (Patched).

### Justification

**False Positive / Patched:**
The vulnerability exists in SheetJS Community Edition versions before 0.19.3. This project uses `xlsx@0.20.3`, which includes the fix. The CVE scanner flags this due to non-standard version resolution.

### Mitigation Controls

- **Version Override:** Explicitly pinned to 0.20.3 via CDN.

### Re-evaluation Date

**Next Review:** 2026-04-18

---

## CVE-2022-24434

### Vulnerability Details

| Field | Value |
|-------|-------|
| **CVE ID** | CVE-2022-24434 |
| **Affected Package** | `dicer` (via `apollo-server-express`) |
| **Vulnerability Type** | Uncaught Exception (DoS) |
| **CVSS Score** | 7.5 (HIGH) |
| **Published Date** | 2022 |
| **Status** | Ignored (No Patch) |

### Assessment

**Affected Package:** `dicer@0.3.0`

**Risk Analysis:**

- **Exploitability:** Moderate (Requires malicious multipart upload).
- **Impact:** Service Crash (DoS).
- **Affected Code Paths:** File uploads via GraphQL.
- **Likelihood of Exploitation:** Low (Mitigated).

### Justification

**No Patch Available:**
The package maintainer has not released a fix. Upgrading to Apollo Server v4 (which removes `dicer`) is a major breaking change planned for Q1 2026.

### Mitigation Controls

- Request size limits (`express.json({ limit: '10mb' })`).
- Rate limiting.
- Input validation.

### Re-evaluation Date

**Next Review:** 2026-02-01

---

## CVE-2023-28155

### Vulnerability Details

| Field | Value |
|-------|-------|
| **CVE ID** | CVE-2023-28155 |
| **Affected Package** | `request` (via `sdk__typescript`) |
| **Vulnerability Type** | SSRF |
| **CVSS Score** | 6.1 (MODERATE) |
| **Published Date** | 2023 |
| **Status** | Ignored (Dev Dependency) |

### Assessment

**Affected Package:** `request@2.88.2`

**Risk Analysis:**

- **Exploitability:** Low.
- **Impact:** Moderate.
- **Affected Code Paths:** Development/Build tooling only.
- **Likelihood of Exploitation:** Very Low.

### Justification

**Dev Dependency Only:**
The vulnerable package is a transitive dependency of `sdk__typescript` and is not included in the production runtime.

### Mitigation Controls

- Strict separation of dev and prod dependencies.

### Re-evaluation Date

**Next Review:** 2026-03-01

---

## Summary Table

| CVE ID | Package | Type | CVSS | Exploitable | Justification | Next Review |
|--------|---------|------|------|-------------|---------------|-------------|
| CVE-2024-22363 | xlsx | ReDoS | HIGH | No (Patched) | False Positive | 2026-04-18 |
| CVE-2023-30533 | xlsx | Proto Pollution | 7.8 | No (Patched) | False Positive | 2026-04-18 |
| CVE-2022-24434 | dicer | DoS | 7.5 | Yes | No Patch/Mitigated | 2026-02-01 |
| CVE-2023-28155 | request | SSRF | 6.1 | No (Dev) | Dev Only | 2026-03-01 |

## Recommendations

### Immediate Actions

1. Maintain `pnpm` overrides.
2. Monitor Apollo Server migration plan.

### Long-term Actions

1. Migrate to Apollo Server v4.
2. Remove `sdk__typescript` if unused.

## Review Process

### Quarterly Review Checklist

- [ ] Run `npm audit` and identify any new vulnerabilities
- [ ] Assess each ignored CVE for continued risk
- [ ] Update justifications if circumstances have changed
- [ ] Identify any new mitigations or compensating controls
- [ ] Update re-evaluation dates
- [ ] Document any changes

### Escalation Criteria

If any of the following conditions are met, immediately escalate:

1. **CVSS Score Increases:** If a CVE's severity increases
2. **Exploit Available:** If a public exploit becomes available
3. **Code Path Changes:** If code using the vulnerable package changes
4. **Dependency Updates:** If the vulnerable package is updated
5. **Threat Intelligence:** If threat actors begin exploiting the CVE

---

**Document Version:** 1.1
**Last Updated:** January 18, 2026
**Prepared by:** Jules (Program Ops)

**Next Review Date:** April 18, 2026
