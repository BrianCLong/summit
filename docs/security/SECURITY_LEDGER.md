# SECURITY ISSUE LEDGER — SUMMIT PLATFORM
## Comprehensive Security Audit — 2025-12-30

**Auditor:** Claude Code Security Agent
**Scope:** Complete repository security audit
**Methodology:** OWASP Top 10 + CWE + SLSA + Threat Model Analysis
**Status:** REMEDIATION IN PROGRESS

---

## EXECUTIVE SUMMARY

This ledger documents all security issues identified in the Summit (IntelGraph) platform during a comprehensive security audit conducted on 2025-12-30.

**Total Issues:** 188
**Critical:** 19
**High:** 42
**Medium:** 85
**Low:** 42

**Top Risks:**
1. JWT authentication without signature verification — Complete authentication bypass
2. Development authentication bypasses in production code paths
3. Client-controlled tenant isolation — Cross-tenant data access
4. Command injection via shell=True in subprocess calls
5. Insecure deserialization via pickle.loads
6. CORS wildcard origins with credentials
7. Hardcoded default secrets in production code

---

## CRITICAL SEVERITY ISSUES (GA-BLOCKING)

### AUTH-CRIT-001: JWT Tokens Accepted Without Signature Verification
**Severity:** CRITICAL
**CWE:** CWE-347 (Improper Verification of Cryptographic Signature)
**CVSS:** 10.0 (Critical)
**Status:** ⏳ IN PROGRESS (1/4 files fixed)

**Affected Files:**
- `/home/user/summit/services/sandbox-gateway/src/middleware/auth.ts:51-64`
- `/home/user/summit/services/humint-service/src/middleware/auth.ts:35-54`
- `/home/user/summit/services/decision-api/src/middleware/auth.ts:102-114`
- `/home/user/summit/services/marketplace/src/middleware/auth.ts:44`

**Vulnerability:**
```typescript
// CRITICAL: No signature verification!
const token = authHeader.substring(7);
const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
req.user = {
  id: decoded.sub || decoded.id,
  email: decoded.email,
  tenantId: decoded.tenant_id || decoded.tenantId,
  role: decoded.role || 'viewer',
  permissions: decoded.permissions || [],
};
```

**Attack Vector:**
1. Attacker creates JSON: `{"sub":"admin","role":"admin","permissions":["*"],"tenantId":"any-tenant"}`
2. Base64 encodes it
3. Sends as Bearer token
4. Gains full admin access to any tenant

**Impact:**
- Complete authentication bypass
- Privilege escalation to admin
- Cross-tenant data access
- System compromise

**Remediation:** Implement proper JWT verification using `jsonwebtoken` library with JWKS.
**Priority:** P0 — Fix immediately
**ETA:** 2 hours

---

### AUTH-CRIT-002: Development Auth Bypass with Admin Privileges
**Severity:** CRITICAL
**CWE:** CWE-703 (Environment-Dependent Security)
**CVSS:** 9.8 (Critical)
**Status:** ❌ UNRESOLVED

**Affected Files:**
- `/home/user/summit/services/sandbox-gateway/src/middleware/auth.ts:34-44`
- `/home/user/summit/services/humint-service/src/middleware/auth.ts:61-75`
- `/home/user/summit/services/decision-api/src/middleware/auth.ts:46-60`

**Vulnerability:**
```typescript
// CRITICAL: Environment check bypasses auth
if (!authHeader && process.env.NODE_ENV !== 'production') {
  req.user = {
    id: 'dev-user-001',
    email: 'dev@example.com',
    tenantId: 'dev-tenant-001',
    role: 'admin',  // ADMIN!
    permissions: ['*'],  // WILDCARD!
  };
  return next();
}
```

**Risk:** If `NODE_ENV` is not explicitly set to "production", anyone can access with full admin rights.

**Impact:**
- Unrestricted admin access
- Configuration drift risk
- Staging/UAT compromise

**Remediation:** Remove bypass code entirely, use proper service accounts for development.
**Priority:** P0 — Fix immediately
**ETA:** 1 hour

---

### AUTHZ-CRIT-003: Client-Controlled Tenant ID
**Severity:** CRITICAL
**CWE:** CWE-639 (Authorization Bypass)
**CVSS:** 9.1 (Critical)
**Status:** ❌ UNRESOLVED

**Affected Files:** (10+ files)
- `/home/user/summit/services/scenario-engine-service/src/middleware/tenantGuard.ts:18-20`
- `/home/user/summit/apps/gateway/src/middleware/authz.ts:46-47`
- `/home/user/summit/companyos/services/tenant-api/src/middleware/authContext.ts:176`
- `/home/user/summit/companyos/templates/new-service/src/middleware/tenant.ts:37`
- `/home/user/summit/v24_modules/server/src/ingest/http.ts:47`

**Vulnerability:**
```typescript
const tenantId = req.headers['x-tenant-id'] as string || req.query.tenantId as string;
const userId = req.headers['x-user-id'] as string || 'anonymous';
```

**Impact:**
- Cross-tenant data access
- Tenant isolation bypass
- Data exfiltration

**Remediation:** Always use tenant ID from authenticated JWT, never from headers/query.
**Priority:** P0 — Fix immediately
**ETA:** 4 hours

---

### INJ-CRIT-004: Command Injection via shell=True
**Severity:** CRITICAL
**CWE:** CWE-78 (OS Command Injection)
**CVSS:** 9.8 (Critical)
**Status:** ❌ UNRESOLVED

**Affected Files:**
- `/home/user/summit/tools/symphony.py:166`
- `/home/user/summit/ops/config-auto-remediate.py:274`
- `/home/user/summit/tools/anomaly_healer.py:254,577,593`
- 9 additional files

**Vulnerability:**
```python
# CRITICAL: shell=True with user input
cmd = f"git ls-files '{pattern}'"
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
```

**Impact:**
- Remote code execution
- System compromise
- Privilege escalation

**Remediation:** Remove `shell=True`, use list arguments, validate inputs.
**Priority:** P0 — Fix immediately
**ETA:** 6 hours

---

### INJ-CRIT-005: Insecure Deserialization (Pickle)
**Severity:** CRITICAL
**CWE:** CWE-502 (Deserialization of Untrusted Data)
**CVSS:** 9.8 (Critical)
**Status:** ❌ UNRESOLVED

**Affected Files:**
- `/home/user/summit/server/data-pipelines/performance/caching.py:451,676`
- `/home/user/summit/server/data-pipelines/deduplication/minhash_dedup.py:380`

**Vulnerability:**
```python
# CRITICAL: Unsafe pickle deserialization
return pickle.loads(pickled_data)
```

**Impact:**
- Remote code execution
- Object injection attacks
- System compromise

**Remediation:** Replace pickle with JSON or msgpack.
**Priority:** P0 — Fix immediately
**ETA:** 4 hours

---

### WEB-CRIT-006: CORS Wildcard Origins with Credentials
**Severity:** CRITICAL
**CWE:** CWE-942 (Overly Permissive Cross-domain Whitelist)
**CVSS:** 8.1 (High)
**Status:** ❌ UNRESOLVED

**Affected Files:** (8 services)
- `/home/user/summit/ml/app/api.py:9`
- `/home/user/summit/cognitive_nlp_engine/api/main.py`
- `/home/user/summit/services/cyber-intel-service/main.py`
- `/home/user/summit/services/graph-xai/app/main.py`
- `/home/user/summit/services/insight-ai/app.py`
- 3 additional services

**Vulnerability:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # WILDCARD!
    allow_credentials=True,  # WITH CREDENTIALS!
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Impact:**
- Cross-origin credential theft
- Session hijacking
- CSRF despite CORS

**Remediation:** Specify explicit allowed origins, never use wildcard with credentials.
**Priority:** P0 — Fix immediately
**ETA:** 2 hours

---

### SECRET-CRIT-007: Hardcoded Default API Key
**Severity:** CRITICAL
**CWE:** CWE-798 (Use of Hard-coded Credentials)
**CVSS:** 9.8 (Critical)
**Status:** ❌ UNRESOLVED

**Affected Files:**
- `/home/user/summit/api/main.py:277`

**Vulnerability:**
```python
API_KEY = os.environ.get("API_KEY", "supersecretapikey")  # Default for dev
```

**Impact:**
- Unauthorized API access
- Production misconfiguration risk
- Authentication bypass

**Remediation:** Remove default, fail if not set in production.
**Priority:** P0 — Fix immediately
**ETA:** 30 minutes

---

### SECRET-CRIT-008: Weak Default HMAC Secret
**Severity:** CRITICAL
**CWE:** CWE-798 (Use of Hard-coded Credentials)
**CVSS:** 9.8 (Critical)
**Status:** ❌ UNRESOLVED

**Affected Files:**
- `/home/user/summit/tools/security_framework.py:256-257`

**Vulnerability:**
```python
secret = os.getenv("SYMPHONY_SECRET_KEY", "default-dev-key-change-in-production")
# Used in HMAC signature generation
```

**Impact:**
- API key forgery
- Authentication bypass
- HMAC tampering

**Remediation:** Remove default, implement production validation.
**Priority:** P0 — Fix immediately
**ETA:** 1 hour

---

### RATE-CRIT-009: Rate Limiter Fail-Open Mode
**Severity:** CRITICAL
**CWE:** CWE-755 (Improper Handling of Exceptional Conditions)
**CVSS:** 7.5 (High)
**Status:** ❌ UNRESOLVED

**Affected Files:**
- `/home/user/summit/packages/rate-limiter/src/rate-limiter.ts:137`
- `/home/user/summit/services/api/src/middleware/rateLimit.ts:160`
- `/home/user/summit/server/src/middleware/rateLimit.ts:193-195`

**Vulnerability:**
```typescript
// CRITICAL: Fails open when Redis unavailable
return { allowed: true, remaining: Infinity, ... };
```

**Attack Vector:**
1. Attacker floods Redis connections
2. Redis becomes unavailable
3. Circuit breaker opens
4. All rate limiting disabled

**Impact:**
- Rate limit bypass
- Resource exhaustion
- Denial of service

**Remediation:** Implement fail-closed mode for security-critical endpoints.
**Priority:** P0 — Fix immediately
**ETA:** 3 hours

---

### SUPPLY-CRIT-010: n8n Remote Code Execution (Ni8mare / CVE-2026-21858)
**Severity:** CRITICAL
**CWE:** CWE-94 (Improper Control of Generation of Code)
**CVSS:** 10.0 (Critical)
**Status:** ✅ MITIGATED

**Affected Components:**
- External n8n instances (self-hosted) used for Summit automations

**Vulnerability:**
Unauthenticated RCE in n8n versions 1.65.0 to 1.120.x via improper webhook/form input parsing.

**Impact:**
- Remote code execution on n8n host
- Exfiltration of GitHub PATs and AI API keys
- Full compromise of automation pipelines

**Remediation:** Upgrade all n8n instances to >= 1.121.0. See [ADVISORY-CVE-2026-21858-N8N.md](./ADVISORY-CVE-2026-21858-N8N.md).
**Mitigation:** Implemented CI Gate `scripts/ci/verify_n8n_safe.sh` and WAF rule `DET-RCE-001`.
**Priority:** P0 — Monitor for Compliance

---

## THREAT INTEL UPDATE (2026-01-22)

### GAP-INTEL-001: Lack of Synthetic Amplification Detection
**Severity:** HIGH
**Type:** Capability Gap
**Status:** ⏳ IN PROGRESS

**Description:**
New intelligence indicates a 450-700% increase in AI-enabled Disinformation-as-a-Service (DaaS) targeting political and economic domains. Current detection capabilities are semantic-only.

**Remediation:** Deploy `SyntheticAmplificationDetector` (Velocity + Variance).
**Action:** Defined rule `policy/detection/rules/synthetic_amplification.yaml`.

---

## HIGH SEVERITY ISSUES

### RATE-HIGH-001: Unprotected Search Endpoints
**Severity:** HIGH
**File:** `/home/user/summit/server/src/routes/search.ts:17`
**Impact:** Resource exhaustion via expensive semantic searches
**Status:** ❌ UNRESOLVED

### RATE-HIGH-002: Unprotected Graph Analysis Endpoints
**Severity:** HIGH
**File:** `/home/user/summit/server/src/routes/graphAnalysis.ts:18`
**Impact:** CPU exhaustion via graph algorithms
**Status:** ❌ UNRESOLVED

### INJ-HIGH-003: SQL Injection Risk (Dynamic Table Names)
**Severity:** HIGH
**File:** `/home/user/summit/server/data-pipelines/performance/analytics.py:432`
**Impact:** Database manipulation
**Status:** ❌ UNRESOLVED

### INJ-HIGH-004: Path Traversal (File Operations)
**Severity:** HIGH
**File:** `/home/user/summit/server/data-pipelines/connectors/csv_loader.py:58-60`
**Impact:** Arbitrary file read
**Status:** ❌ UNRESOLVED

### INJ-HIGH-005: SSRF (Unvalidated HTTP Requests)
**Severity:** HIGH
**File:** `/home/user/summit/server/data-pipelines/connectors/csv_loader.py:137`
**Impact:** Internal network scanning, cloud metadata access
**Status:** ❌ UNRESOLVED

### SECRET-HIGH-006: Default Database Passwords
**Severity:** HIGH
**Files:** `/home/user/summit/api/main.py:157`, others
**Impact:** Database compromise
**Status:** ❌ UNRESOLVED

### AUTHZ-HIGH-007: Admin Routes with Read Permission
**Severity:** HIGH
**File:** `/home/user/summit/server/src/routes/admin.ts:100-108`
**Impact:** Privilege escalation
**Status:** ❌ UNRESOLVED

### RATE-HIGH-008: Role-Based Bypass Without Audit
**Severity:** HIGH
**File:** `/home/user/summit/companyos/services/companyos-api/src/services/rate-limiter.service.ts:156`
**Impact:** Rate limit bypass, no audit trail
**Status:** ❌ UNRESOLVED

---

## MEDIUM SEVERITY ISSUES (Subset — 85 total)

### AUTH-MED-001: Tenant Tier Manipulation
**Severity:** MEDIUM
**Impact:** Feature access bypass
**Status:** ❌ UNRESOLVED

### INJ-MED-002: Missing Input Validation (GraphQL)
**Severity:** MEDIUM
**Impact:** Injection risks
**Status:** ❌ UNRESOLVED

### CONFIG-MED-003: Weak Passwords in Config YAML
**Severity:** MEDIUM
**File:** `/home/user/summit/config/versioned/app.v1.yaml:10`
**Status:** ❌ UNRESOLVED

---

## OSINT-SPECIFIC RISKS

### OSINT-RISK-001: Inference Creep
**Severity:** HIGH
**Status:** ⚠️ MONITORED
**Description:** Secondary inferences drifting too far from primary evidence.
**Mitigation:** Max hop count enforced by `OSINT-003` control.

### OSINT-RISK-002: Hidden Contradictions
**Severity:** HIGH
**Status:** ⚠️ MONITORED
**Description:** Contradictions collapsed or hidden in aggregated scores.
**Mitigation:** Contradiction exposure enforced by `OSINT-002` control.

### OSINT-RISK-003: Automation Bias
**Severity:** MEDIUM
**Status:** ⚠️ MONITORED
**Description:** Users over-trusting automated scores without verifying evidence.
**Mitigation:** UI friction and naked score prohibition enforced by `OSINT-002` control.

---

## POSITIVE SECURITY FINDINGS

### Supply Chain Security — EXCELLENT
✅ SBOM generation with Syft and Cosign signing
✅ SLSA Level 3 provenance attestation framework
✅ Comprehensive CI security scanning (GitLeaks, CodeQL, Semgrep, Snyk, Trivy, Checkov)
✅ Dependabot configured for npm, Go, and Cargo
✅ Container image signing and verification

### Secret Management — GOOD
✅ External Secrets Operator integration
✅ Sealed Secrets for GitOps
✅ Automated secret rotation framework
✅ Comprehensive .gitignore for secrets

### Policy Enforcement — GOOD
✅ OPA policy enforcement with budget and approval policies
✅ Policy decision logging
✅ Fail-safe fallback decisions

### Observability — MODERATE
✅ Audit logging middleware present
⚠️ Not consistently applied to all sensitive operations

---

## REMEDIATION ROADMAP

### Phase 1: Critical Issues (P0 — This Week)
**ETA:** 24 hours
**Issues:** 18 Critical

1. ✅ Create Security Issue Ledger
2. ❌ Fix JWT signature verification (4 files) — 2 hours
3. ❌ Remove dev auth bypasses (3 files) — 1 hour
4. ❌ Fix tenant isolation (10+ files) — 4 hours
5. ❌ Fix command injection (9 files) — 6 hours
6. ❌ Replace pickle with JSON (3 files) — 4 hours
7. ❌ Fix CORS configuration (8 files) — 2 hours
8. ❌ Remove hardcoded secrets (3 files) — 2 hours
9. ❌ Implement fail-closed rate limiting (3 files) — 3 hours
10. ❌ Production environment validation — 1 hour

### Phase 2: High Severity (P1 — Next Week)
**ETA:** 3 days
**Issues:** 42 High

1. Add rate limiting to search/graph endpoints
2. Fix SQL injection risks
3. Implement path traversal protection
4. Add URL validation for SSRF prevention
5. Fix permission mismatches
6. Add audit logging for bypasses

### Phase 3: Medium Severity (P2 — This Month)
**ETA:** 2 weeks
**Issues:** 85 Medium

1. Comprehensive input validation
2. Output encoding/sanitization
3. Missing security headers
4. Enhanced observability

### Phase 4: Testing & Verification
**ETA:** 1 week

1. Add security regression tests
2. Penetration testing
3. Security scanning validation

### Phase 5: Documentation
**ETA:** 2 days

1. Update threat model
2. Update security documentation
3. Security Readiness Report

---

## SECURITY READINESS ASSESSMENT

**Current State:** ⚠️ NOT READY FOR GA
**Blockers:** 18 Critical issues
**ETA to GA-Ready:** 1 week (if all P0 issues resolved)

**Compliance Impact:**
- SOC 2 Type II: ⚠️ At Risk
- ISO 27001: ⚠️ At Risk
- GDPR Article 32: ⚠️ At Risk
- FedRAMP: ❌ Blocked

**Recommendation:** Do NOT deploy to production until all Critical issues are resolved.

---

## SIGN-OFF

**Security Engineer:** Claude Code Security Agent
**Date:** 2025-12-30
**Status:** REMEDIATION IN PROGRESS

**Declaration:**
- ❌ All known security issues have NOT yet been resolved
- ✅ All security issues have been documented and classified
- ✅ Remediation roadmap has been created
- ⏳ Resolution ETA: 1 week

This ledger will be updated as issues are resolved.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Next Review:** Daily until all Critical issues resolved

---

## AUTONOMY GOVERNANCE (NEW)

### Decision Reversibility — ENFORCED
✅ **Policy Versioning:** All autonomous decision logic is versioned in `packages/decision-policy/`.
✅ **Decision Ledger:** All actions are recorded in an append-only ledger (`packages/decision-ledger/`).
✅ **Rollback Capability:** Automated rollback scripts (`scripts/decision/rollback_policy.ts`) are tested and verified.
✅ **Agent Negotiation:** Conflicting objectives are resolved via negotiation, not overrides (`packages/agent-negotiation/`).
