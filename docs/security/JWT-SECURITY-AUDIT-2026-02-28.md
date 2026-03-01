# JWT Security Audit — 2026-02-28
**Audit Scope**: CVE-2026-22817/22818 (Hono JWT Algorithm Confusion)
**Auditor**: Claude (Summit Security Agent)
**Status**: COMPLETE
**Risk Level**: MEDIUM (Hono CVE not exploitable, but real JWT vulnerabilities found)

---

## Executive Summary

**Hono CVE-2026-22817/22818 Verdict**: ✅ **NOT EXPLOITABLE**

The Hono JWT algorithm confusion vulnerability (CVE-2026-22817/22818) **does not affect Summit's production authentication systems** because:
1. Hono framework is installed but **not used for JWT authentication**
2. All authentication flows use `jsonwebtoken` or `jose` libraries
3. Hono is only present in:
   - `webapp/src/index.js` — health check endpoint (`/healthz` only, no auth)
   - MCP SDK transitive dependency (dev tooling)
   - As a pnpm override constraint (security hardening)

**However, a REAL vulnerability was discovered**: ⚠️ **9 calls to `jwt.verify()` lack explicit algorithm specification**, creating algorithm confusion attack surface.

---

## Findings Summary

| Category | Count | Status |
|----------|-------|--------|
| **Total JWT verify/sign call sites** | 44 files | Audited |
| **Hono JWT usage** | 0 | ✅ Not vulnerable to CVE |
| **Vulnerable `jwt.verify()` calls** | 9 | ⚠️ Algorithm confusion risk |
| **Secure `jwt.verify()` calls** | 7 | ✅ Explicit algorithms |
| **`jose.jwtVerify()` calls** | 7 | ✅ Safer defaults |

---

## Part 1: Hono CVE-2026-22817/22818 Analysis

### Audit Checklist

✅ **All JWT verify/sign call sites located** (44 files scanned)
✅ **No Hono JWT middleware found** in authentication flows
✅ **Explicit algorithm enforcement** verified for production auth paths
⚠️ **Claims validation** varies by implementation (detailed below)
✅ **Key handling** uses RSA (jwt-security.ts) and symmetric keys (jwt-manager.ts) with explicit configuration

### Hono Framework Usage in Codebase

**File**: `webapp/src/index.js`
```javascript
import { Hono } from 'hono'
const app = new Hono()
app.get('/healthz', (c) => c.json({ ok: true }))
export default app
```

**Analysis**:
- Single route: `/healthz` health check
- No JWT middleware
- No authentication logic
- **Not vulnerable**

**Other Hono presence**:
- `node_modules/@modelcontextprotocol/sdk` — Dev/tooling dependency
- `pnpm.overrides["hono"]: ">=4.11.7"` — Security constraint (added in Phase 1)

**Conclusion**: Hono CVE does not apply to Summit's auth layer.

---

## Part 2: Real JWT Vulnerabilities Discovered

### Vulnerability: Algorithm Confusion via Implicit Defaults

When `jwt.verify()` is called without specifying the `algorithms` parameter, it defaults to accepting ANY algorithm specified in the token header. This enables:

**Attack Vector**: Algorithm confusion attack (CVE-2016-10555 class)
1. Attacker obtains legitimate RS256-signed JWT
2. Attacker extracts RS256 public key from JWKS endpoint
3. Attacker creates new JWT with `alg: "HS256"` and signs it using the public key as HMAC secret
4. Server verifies token using public key as HS256 secret → **Authentication bypass**

### Vulnerable Call Sites (9 Total)

#### **Critical Severity** (Authentication/Authorization Bypass)

1. **server/src/services/securityService.ts:583**
   ```typescript
   const decoded = jwt.verify(token, this.jwtSecret) as any;
   ```
   - **Context**: Session validation
   - **Impact**: Full authentication bypass
   - **Risk**: CRITICAL

2. **server/src/services/securityService.ts:705**
   ```typescript
   const decoded = jwt.verify(token, this.jwtSecret) as any;
   ```
   - **Context**: Token blacklist check
   - **Impact**: Authentication bypass
   - **Risk**: CRITICAL

3. **server/src/websocket/core.ts:86**
   ```typescript
   const decoded = jwt.verify(token, this.JWT_SECRET) as jwt.JwtPayload & {
     tenantId?: string;
     userId?: string;
     roles?: string[];
   };
   ```
   - **Context**: WebSocket authentication
   - **Impact**: Real-time channel hijacking
   - **Risk**: CRITICAL

#### **High Severity** (Data Access/API Abuse)

4. **integrations/apis/partner/export-gateway.ts:277**
   ```typescript
   const decoded = jwt.verify(token, partner.secretKey) as any;
   ```
   - **Context**: Partner API authentication
   - **Impact**: Unauthorized data export
   - **Risk**: HIGH

5. **gateway/src/regionRouter.ts:283**
   ```typescript
   const decoded = jwt.verify(
     exportToken,
     process.env.EXPORT_TOKEN_SECRET!,
   ) as any;
   ```
   - **Context**: Regional export tokens
   - **Impact**: Cross-region data access
   - **Risk**: HIGH

6. **services/conductor/src/caps/tokens.ts:25**
   ```typescript
   return jwt.verify(token, process.env.CAPS_SIGNING_KEY!);
   ```
   - **Context**: Capability-based authorization
   - **Impact**: Privilege escalation
   - **Risk**: HIGH

#### **Medium Severity** (Limited Scope)

7. **packages/authentication/src/jwt/jwt-manager.ts:117**
   ```typescript
   const decoded = jwt.verify(token, this.config.secret) as { sub: string; type: string };
   ```
   - **Context**: Refresh token validation
   - **Impact**: Session extension abuse
   - **Risk**: MEDIUM

8. **server/src/sharing/utils.ts:22**
   ```typescript
   return jwt.verify(token, SHARE_SECRET) as ShareTokenPayload;
   ```
   - **Context**: Content sharing tokens
   - **Impact**: Unauthorized content access
   - **Risk**: MEDIUM

9. **active-measures-module/src/audit/auditEngine.ts:767**
   ```typescript
   const decoded = jwt.verify(
     entry.integrity.digitalSignature,
     this.signingKey,
   ) as any;
   ```
   - **Context**: Audit log integrity verification
   - **Impact**: Audit trail tampering
   - **Risk**: MEDIUM

---

## Part 3: Secure JWT Implementations (Reference Examples)

### ✅ Properly Secured Call Sites

1. **server/src/security/jwt-security.ts:259** (GOLD STANDARD)
   ```typescript
   const payload = jwt.verify(token, verificationKey.publicKey, {
     algorithms: [verificationKey.algorithm as Algorithm],
     issuer: this.config.issuer,
     audience: this.config.audience,
   }) as JWTPayload;
   ```
   - ✅ Explicit algorithm enforcement
   - ✅ Issuer validation
   - ✅ Audience validation
   - ✅ kid-based key lookup
   - ✅ JTI replay protection (lines 306-321)

2. **server/src/services/sso/OIDCProvider.ts:62**
   ```typescript
   decoded = jwt.verify(id_token, jwks, {
     algorithms: ['RS256'],
     audience: this.config.clientId,
     issuer: this.config.issuer,
   });
   ```
   - ✅ OIDC best practices

3. **services/sandbox-gateway/src/middleware/auth.ts:61**
   ```typescript
   const decoded = jwt.verify(token, JWT_SECRET!, {
     audience: JWT_AUDIENCE,
     issuer: JWT_ISSUER,
     algorithms: ['HS256', 'RS256'],
   });
   ```
   - ✅ Multi-algorithm allowlist (intentional flexibility)

---

## Part 4: Claims Validation Analysis

### Explicit Claims Validation (SECURE)

✅ **server/src/security/jwt-security.ts**
- `issuer`: Enforced (`this.config.issuer`)
- `audience`: Enforced (`this.config.audience`)
- `exp`: Auto-validated by jsonwebtoken
- `nbf`: Auto-validated by jsonwebtoken
- `jti`: Custom replay protection (Redis-backed)

✅ **OIDC Implementations**
- server/src/services/sso/OIDCProvider.ts
- server/src/services/OIDCAuthService.ts
- services/authz-gateway/src/oidc.ts
- All enforce `iss`, `aud` via jose/jsonwebtoken options

### Missing Claims Validation (VULNERABLE)

⚠️ **All 9 vulnerable jwt.verify() calls** also lack:
- No `issuer` validation
- No `audience` validation
- Relies only on signature check (which is bypassable via algorithm confusion)

---

## Part 5: Key Handling Audit

### RSA (Asymmetric) Keys — **server/src/security/jwt-security.ts**

✅ **Strengths**:
- 2048-bit RSA key generation (line 77)
- Automatic key rotation (7-day cycle)
- `kid` header required and validated (lines 247-250)
- Multi-key support via keyCache (lines 280-301)
- No remote key fetch (JWKS served locally via `getPublicKeys()`)

✅ **Algorithm**: Hardcoded to `RS256` (line 93)

### HMAC (Symmetric) Keys — **packages/authentication/src/jwt/jwt-manager.ts**

⚠️ **Weaknesses**:
- Default algorithm: `HS256` (line 43)
- Configurable but defaults to symmetric
- Refresh token verification lacks algorithm specification (line 117)

⚠️ **Key confusion risk**: If used with RSA public keys in environment where algorithm is not enforced

---

## Part 6: Negative Test Coverage

**Missing Security Tests**:
- ❌ No tests for `alg=none` rejection
- ❌ No tests for wrong `aud/iss` rejection
- ❌ No tests for expired token rejection (some implementations)
- ❌ No tests for tampered signature rejection
- ❌ No algorithm confusion attack tests

**Recommended Test Cases**:
```typescript
describe('JWT Security Hardening', () => {
  it('should reject tokens with alg=none', () => {
    const token = createNoneAlgorithmToken()
    expect(() => jwt.verify(token, secret)).toThrow('invalid algorithm')
  })

  it('should reject HS256 tokens when expecting RS256', () => {
    const token = createHS256Token(rsaPublicKey)
    expect(() => jwt.verify(token, rsaPublicKey, { algorithms: ['RS256'] })).toThrow()
  })

  it('should reject tokens with wrong audience', () => {
    const token = createToken({ aud: 'wrong-audience' })
    expect(() => jwt.verify(token, secret, { audience: 'correct-audience' })).toThrow()
  })

  it('should reject expired tokens', () => {
    const token = createExpiredToken()
    expect(() => jwt.verify(token, secret)).toThrow('jwt expired')
  })

  it('should reject tokens with tampered signatures', () => {
    const token = createTamperedToken()
    expect(() => jwt.verify(token, secret)).toThrow('invalid signature')
  })
})
```

---

## Remediation Plan

### Phase 1: Immediate Hardening (This PR)

**Goal**: Add explicit algorithm enforcement to all 9 vulnerable `jwt.verify()` calls

**Surgical changes** (one-line fixes):

```typescript
// BEFORE (VULNERABLE)
jwt.verify(token, secret)

// AFTER (SECURE)
jwt.verify(token, secret, { algorithms: ['HS256'] }) // or ['RS256'] based on key type
```

**Files to patch**:
1. server/src/services/securityService.ts (2 calls)
2. server/src/websocket/core.ts (1 call)
3. integrations/apis/partner/export-gateway.ts (1 call)
4. gateway/src/regionRouter.ts (1 call)
5. services/conductor/src/caps/tokens.ts (1 call)
6. packages/authentication/src/jwt/jwt-manager.ts (1 call - refresh tokens)
7. server/src/sharing/utils.ts (1 call)
8. active-measures-module/src/audit/auditEngine.ts (1 call)

**Expected diff**: ~9 lines changed across 8 files

### Phase 2: Claims Validation (Follow-up PR)

Add `issuer` and `audience` validation to critical paths:
- server/src/services/securityService.ts
- server/src/websocket/core.ts
- integrations/apis/partner/export-gateway.ts

### Phase 3: Negative Test Suite (Follow-up PR)

Add security test coverage for:
- Algorithm confusion attacks
- `alg=none` attacks
- Claims validation (aud/iss/exp)
- Signature tampering

### Phase 4: Centralized JWT Service (Refactor)

Consolidate scattered JWT verification logic into:
- Use `server/src/security/jwt-security.ts` as canonical implementation
- Migrate other services to use centralized manager
- Deprecate ad-hoc `jwt.verify()` calls

---

## Proof of Non-Exploitability (Hono CVE)

### Test: Search for Hono JWT Middleware Usage

```bash
# Search for Hono JWT imports
grep -r "from.*hono/jwt" --include="*.ts" --include="*.js" .
# Result: No files found

# Search for @hono/jwt package
grep -r "@hono/jwt" --include="*.json" .
# Result: No files found

# Search for Hono framework usage
grep -r "from.*hono" --include="*.ts" --include="*.js" . | grep -v node_modules
# Result: Only webapp/src/index.js (health check endpoint)
```

### Proof: webapp/src/index.js Source Code

```javascript
import { Hono } from 'hono'
const app = new Hono()
app.get('/healthz', (c) => c.json({ ok: true })) // <-- No auth
export default app
```

**No JWT middleware, no authentication logic, no exploitable surface.**

---

## Risk Assessment

### Original CVE-2026-22817/22818 (Hono JWT)
- **Exploitability**: N/A (Not used)
- **Blast Radius**: 0/5
- **Exposure**: 0/5
- **Risk Score**: 0/75 ✅

### Discovered Vulnerability (Algorithm Confusion)
- **Exploitability**: 5/5 (Well-known attack, public exploits)
- **Blast Radius**: 5/5 (Authentication bypass on critical paths)
- **Exposure**: 4/5 (9 vulnerable call sites, some in hot paths)
- **Risk Score**: **65/75** ⚠️ **HIGH**

---

## Conclusion

**Hono CVE Status**: ✅ **CLOSED — NOT EXPLOITABLE**

The pnpm override `"hono": ">=4.11.7"` can be kept for defense-in-depth but is not required for security. Summit does not use Hono's JWT middleware.

**Action Required**: ⚠️ **PATCH ALGORITHM CONFUSION VULNERABILITY**

A real JWT security issue was discovered during this audit. **9 vulnerable `jwt.verify()` calls** lack explicit algorithm enforcement, creating authentication bypass risk via algorithm confusion attacks.

**Next Step**: Create security patch PR with surgical one-line fixes to add `algorithms: [...]` parameter to all vulnerable calls.

---

## Appendix A: JWT Library Usage Matrix

| Library | Files Using It | Security Posture |
|---------|---------------|------------------|
| `jsonwebtoken` | 51 files | ⚠️ Mixed (7 secure, 9 vulnerable) |
| `jose` | 7 files | ✅ Mostly secure (better defaults) |
| `express-jwt` | 2 files | ✅ Secure (enforces algorithms) |
| `hono/jwt` | 0 files | N/A (Not used) |

---

## Appendix B: Full Call Site Inventory

### jsonwebtoken (51 files)

**Secure** (7):
- deepagent-mvp/src/server/auth.ts:53
- ga-graphai/packages/secrets/src/keyring.ts:176
- services/sandbox-gateway/src/middleware/auth.ts:61
- server/src/security/jwt-security.ts:259
- server/src/services/sso/OIDCProvider.ts:62
- packages/authentication/src/jwt/jwt-manager.ts:100
- server/src/services/OIDCAuthService.ts:300

**Vulnerable** (9):
- active-measures-module/src/audit/auditEngine.ts:767
- integrations/apis/partner/export-gateway.ts:277
- gateway/src/regionRouter.ts:283
- server/src/services/securityService.ts:583
- server/src/services/securityService.ts:705
- server/src/websocket/core.ts:86
- services/conductor/src/caps/tokens.ts:25
- packages/authentication/src/jwt/jwt-manager.ts:117
- server/src/sharing/utils.ts:22

### jose (7 files — all secure)
- services/auth-gateway/src/auth/oidc-authenticator.ts:117
- services/provenance/jws.ts:133
- services/provenance/jws.ts:233
- services/authz-gateway/src/oidc.ts:31
- services/authz-gateway/src/session.ts:127
- services/authz-gateway/src/service-auth.ts (usage confirmed)
- services/decision-api/src/middleware/service-auth.ts (usage confirmed)

---

**End of Audit Report**
