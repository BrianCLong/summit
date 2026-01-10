# Security Audit Report & Remediation Plan - Sprint 1

## Executive Summary
**Date:** 2026-01-08
**Auditor:** Jules

A comprehensive security audit identified critical vulnerabilities in dependencies and potential code-level security risks. The focus of Sprint 1 is to remediate high-severity dependency vulnerabilities and establish a baseline security posture.

**Total Vulnerabilities Identified (High Severity):** 7
**Code Scanning Alerts:** Multiple potential issues (eval usage, exec usage, dangerous innerHTML)

## 1. Vulnerability Audit

### High Severity Dependency Vulnerabilities
| Package | Vulnerability | Severity | Affected Version | Fixed Version | Locations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `@modelcontextprotocol/sdk` | ReDoS (CVE-2026-0621) | High | <1.25.2 | 1.25.2 | `packages/strands-agents` |
| `preact` | HTML Injection (CVE-2026-22028) | High | 10.26.5 - 10.28.1 | 10.28.2 | `apps/mobile-interface` |
| `react-router` | XSS / CSRF (CVE-2026-22029, CVE-2026-22030) | High | <=7.11.0 | 7.12.0 | `apps/field-kit`, `client` |
| `@remix-run/router` | XSS via Open Redirects (CVE-2026-22029) | High | <=1.23.1 | 1.23.2 | `apps/labeling-ui` |

### Code Vulnerabilities (Static Analysis)
- **`eval()` Usage**:
    - `impl/sre/cli.py`: Potential insecure evaluation of trace metrics.
    - `services/insight-ai/app.py`: PyTorch `model.eval()` - likely safe (mode switch), but needs verification.
    - `services/marketplace/src/utils/cache.ts`: `redis.eval` - Acceptable if scripts are static.
    - `services/rules/src/engine.ts`: `jexl.eval` - Safe if Jexl is sandboxed, but warrants review.
- **`exec()` Usage**:
    - `agents/multimodal/text-pipeline.ts`: Regex execution (Safe).
    - `conductor-ui/frontend/tools/*.js`: Build tools (Safe).
    - `active-measures-module/src/fearsome/forecast.ts`: `execSync` - Needs review for command injection.
- **`dangerouslySetInnerHTML`**:
    - Detected in build artifacts (`dist-new`). Need to trace back to source `src` files in `apps/web` or `conductor-ui` to ensure inputs are sanitized.

## 2. Prioritization Matrix (Top Items)

1. **[CRITICAL]** Update `@modelcontextprotocol/sdk` to `1.25.2` (DoS vector).
2. **[CRITICAL]** Update `preact` to `10.28.2` (Injection vector).
3. **[HIGH]** Update `react-router` and `@remix-run/router` families (XSS/CSRF).
4. **[HIGH]** Verify `active-measures-module/src/fearsome/forecast.ts` for command injection.

## 3. Remediation Strategy

### Batch 1: Dependencies (Quick Wins)
- Update `packages/strands-agents/package.json`
- Update `apps/mobile-interface/package.json`
- Update `apps/field-kit/package.json`
- Update `client/package.json`
- Update `apps/labeling-ui/package.json`

### Batch 2: Code Hardening
- Review `active-measures-module` exec usage.
- Add `SECURITY.md` to root if missing (it exists, but check content).

## 4. Execution Plan (Sprint 1)

1.  **Dependency Updates**: Apply version bumps to `package.json` files.
2.  **Verification**: Run `pnpm install` and tests to ensure no breaking changes.
3.  **Documentation**: Update `SECURITY.md` with reporting guidelines if needed.
