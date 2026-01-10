# Executive Truth Tables: Summit GA "Ironclad Standard"

These tables provide a direct, evidence-based mapping of platform capabilities, security posture, and risks.

## A) Capability → Proof

This table maps GA capabilities to the specific artifacts that verify their implementation.

| Capability | Evidence Path | Verification Command |
| :--- | :--- | :--- |
| **Accessibility & Keyboard Gate** | `e2e/a11y-keyboard/a11y-gate.spec.ts` | `pnpm test:e2e` (via `a11y-keyboard-smoke.yml`) |
| **Demo Mode Hard Gate** | `testing/ga-verification/ga-features.ga.test.mjs` | `node testing/ga-verification/ga-features.ga.test.mjs` |
| **Rate Limiting** | `docs/API_RATE_LIMITING.md` | `npm run verify:living-documents` |
| **AuthN/AuthZ Helpers** | `docs/AUTHZ_IMPLEMENTATION_SUMMARY.md` | `npm run verify:living-documents` |
| **Observability Taxonomy** | `summit_observability/METRICS.md` | `npm run verify:living-documents` |
| **Data Classification & Governance** | `docs/DATA_GOVERNANCE.md` | `npm run verify:living-documents` |
| **Policy Preflight & Receipts** | `PROVENANCE_SCHEMA.md` | `scripts/ga/verify-ga-surface.mjs` |
| **Ingestion Security Hardening** | `docs/security/security-architecture-and-policies.md` | `npm run verify:living-documents` |

*Source: `docs/ga/MVP4_GA_EVIDENCE_MAP.md`*

## B) Security Posture → Action Taken

This table summarizes the state of security remediation based on the comprehensive audit.

| Area | Issue | Resolution | Status |
| :--- | :--- | :--- | :--- |
| **Authentication** | JWTs accepted without signature verification | Implement proper JWT verification using `jsonwebtoken` | ⏳ IN PROGRESS |
| **Authentication** | Development auth bypass with admin privileges | Remove bypass code entirely | ❌ UNRESOLVED |
| **Authorization** | Client-controlled Tenant ID (cross-tenant access) | Use tenant ID from authenticated JWT only | ❌ UNRESOLVED |
| **Injection** | OS Command Injection via `shell=True` | Remove `shell=True`, use list arguments | ❌ UNRESOLVED |
| **Injection** | Insecure Deserialization via `pickle.loads` | Replace `pickle` with `JSON` | ❌ UNRESOLVED |
| **Web Security** | CORS wildcard `*` with credentials | Specify explicit, whitelisted origins | ❌ UNRESOLVED |
| **Secrets** | Hardcoded default API key and HMAC secret | Remove defaults, fail if not set in production | ❌ UNRESOLVED |
| **Rate Limiting** | Rate limiter fails open when Redis is unavailable | Implement fail-closed mode for critical endpoints | ❌ UNRESOLVED |

*Source: `docs/security/SECURITY_REMEDIATION_LEDGER.md`*

## C) Risk → Control

This table maps known GA risks and blockers to their governing controls and status.

| Risk | Control | Owner | Status |
| :--- | :--- | :--- | :--- |
| **Test Flakiness** | TypeScript test errors are non-blocking | Engineering | ⚠️ **BLOCKER** (GA Decision #1) |
| **Incomplete Verification** | Full `make ci` run has not been completed | Release Captain | ⚠️ **BLOCKER** |
| **Unknown Vulnerabilities**| Security scan (`npm run security:check`) not executed | Security | ⚠️ **BLOCKER** |
| **Missing Compliance Artifact** | SBOM generation is pending | Security | ⚠️ **BLOCKER** |
| **Performance Degradation**| Load tests are blocked (k6 environment unavailable) | SRE | ⚠️ **BLOCKED** (P1) |
| **Lack of Formal Sign-off** | Product/Eng/Security/SRE sign-offs not captured | Release Captain | ⚠️ **BLOCKED** (P1) |

*Source: `docs/ga/MVP4_GA_BASELINE.md`*
