# Security Remediation Plan: "Operation Fortify"

**Date:** 2025-05-20
**Author:** Jules (Security Engineer)
**Status:** Urgent / In-Progress

## Executive Summary

A security audit of the Summit platform (IntelGraph, Maestro, CompanyOS, Switchboard) has identified critical vulnerabilities requiring immediate remediation. This plan outlines the prioritized actions to address hardcoded secrets, remote code execution risks in dependencies, and cross-site scripting (XSS) vectors.

## 1. Top 10 Critical Vulnerabilities (Prioritized)

| Priority | ID | Component | Vulnerability | Risk | Impact | Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P0** | SEC-001 | `services/authz-gateway` | Hardcoded `TEST_API_KEY` in source | Critical | Credential Leakage | Rotate Key & Use Env Vars |
| **P0** | SEC-002 | `config/app.yaml` | Default `password: "password"` | Critical | Unauthorized Access | Enforce Strong Auth Config |
| **P0** | SEC-003 | `client/.../IntelligentCopilot` | Unsanitized `dangerouslySetInnerHTML` | High | Stored XSS | Implement `DOMPurify` |
| **P0** | SEC-004 | `expr-eval` (Dep) | Prototype Pollution (CVE-202X-XXXX) | High | RCE / DoS | Upgrade/Override Dependency |
| **P1** | SEC-005 | `deploy/compose/otel-config.yaml` | `insecure: true` (TLS Skip) | High | MITM Attack | Enable TLS Verification |
| **P1** | SEC-006 | `apps/web/.../EntityDrawer` | Potential XSS in Entity Drawer | High | Stored XSS | Audit & Sanitize |
| **P2** | SEC-007 | `ops/.../cronjobs.yaml` | Hardcoded `aws_secret_access_key` | Medium | Credential Exposure | Use K8s Secrets |
| **P2** | SEC-008 | `node-nlp` -> `xlsx` | Transitive ReDoS / Pollution | Medium | DoS | Override `xlsx` Version |
| **P2** | SEC-009 | `docs/.../superprompt.md` | Leaked API Key in Docs | Low | Accidental Usage | Redact Secrets in Docs |
| **P3** | SEC-010 | `crypto-hygiene` | Deprecated Crypto Algorithms | Low | Compliance | Modernize Algorithms |

## 2. Batch Remediation Strategy

### Batch A: Secrets & Configuration Hardening (Target: P0/P1)
- **Objective:** Eliminate cleartext credentials from the codebase.
- **Tools:** Manual replacement + Env Var injection.
- **Files:**
    - `services/authz-gateway/src/api-keys.ts`
    - `config/app.yaml`
    - `docs/agents/variants/ci-aware-superprompt.md`
    - `ops/deployment/backup-verification-cronjobs.yaml`

### Batch B: Frontend XSS Hygiene (Target: P0/P1)
- **Objective:** Sanitize all dynamic HTML injection points.
- **Pattern:** Replace `dangerouslySetInnerHTML={{ __html: content }}` with `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}`.
- **Files:**
    - `client/src/components/ai/IntelligentCopilot.js`
    - `apps/web/src/components/panels/EntityDrawer.tsx`

### Batch C: Dependency Supply Chain (Target: P0/P2)
- **Objective:** Patch vulnerable libraries via package manager overrides.
- **Action:**
    - Add `pnpm.overrides` for `expr-eval` (if version available) or replace usage.
    - Force resolution of `xlsx` to secure version (`0.20.3+`).

## 3. Dependencies & Risks

- **IntelGraph:** The `expr-eval` library is likely used for graph query expression evaluation. Remediation requires regression testing of the graph query engine.
- **Switchboard:** Changes to `aws_secret_access_key` handling in cronjobs requires validating that the K8s secrets are properly mounted in the production environment.
- **Maestro:** No direct critical deps identified, but shared config in `config/app.yaml` affects all services.

## 4. Estimated Effort

| Batch | Tasks | Effort (Engineer Days) |
| :--- | :--- | :--- |
| **A: Secrets** | SEC-001, 002, 007, 009 | 0.5 |
| **B: Frontend** | SEC-003, 006 | 0.5 |
| **C: Deps** | SEC-004, 008 | 1.0 |
| **Total** | | **2.0 Days** |

---

**Immediate Next Steps:**
1. Execute Batch A (Secrets).
2. Execute Batch B (XSS).
3. Execute Batch C (Deps).
