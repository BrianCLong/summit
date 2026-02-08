# Threat Model: API Gateway

**Subsystem:** API Gateway
**Version:** 1.0
**Date:** 2025-12-27
**Methodology:** STRIDE
**Owner:** Security Team
**Status:** GA Hardening Review

## System Overview

The API Gateway is a GraphQL-based service that acts as the primary entry point for client applications. It:
- Exposes GraphQL API at `/graphql`
- Implements policy enforcement via middleware
- Provides authentication and authorization
- Uses Apollo Server with Express
- Includes CORS configuration
- Health check endpoint at `/health`

### Architecture Components
- **Entry Points:** GraphQL endpoint, Health endpoint
- **Dependencies:** Authentication services, Policy engine, Downstream services
- **Data Flow:** Client → API Gateway → Backend Services
- **Technology Stack:** Node.js, Express, Apollo Server, GraphQL

---

## STRIDE Analysis

### S - Spoofing Identity

#### Threat 1.1: Unauthenticated GraphQL Access
**Description:** Attacker bypasses authentication to execute GraphQL queries
**Attack Vector:** Direct requests to `/graphql` endpoint without valid credentials
**DREAD Score:**
- Damage: 9 (Full system access)
- Reproducibility: 8 (Easy to attempt)
- Exploitability: 7 (Depends on auth implementation)
- Affected Users: 10 (All users)
- Discoverability: 9 (Publicly exposed endpoint)
- **Total: 8.6 (CRITICAL)**

**Existing Mitigation:**
- Context creation function (`createContext`) for auth handling
- Policy guard middleware

**Required Mitigation:**
- Enforce mandatory authentication on all GraphQL operations
- Implement JWT validation with short expiration times (≤15 min)
- Add rate limiting per IP/user
- Require client certificates for sensitive operations

**SOC 2 Mapping:** CC6.1, CC6.2, CC6.6

**Gap Status:** ⚠️ PARTIAL - Need explicit auth enforcement verification

---

#### Threat 1.2: JWT Token Theft/Replay
**Description:** Stolen JWT tokens used to impersonate legitimate users
**Attack Vector:** XSS, network sniffing, or local storage theft
**DREAD Score:**
- Damage: 8 (User account compromise)
- Reproducibility: 6 (Requires token theft)
- Exploitability: 7 (Common attack)
- Affected Users: 7 (Individual users)
- Discoverability: 6 (Requires knowledge)
- **Total: 6.8 (HIGH)**

**Existing Mitigation:**
- CORS configuration limits origin
- Credentials flag enabled

**Required Mitigation:**
- Implement refresh token rotation
- Add device fingerprinting
- Monitor for concurrent sessions from different IPs
- Use HttpOnly, Secure, SameSite cookies
- Implement token binding

**SOC 2 Mapping:** CC6.1, CC6.7

**Gap Status:** ⚠️ PARTIAL - Need refresh token implementation

---

### T - Tampering with Data

#### Threat 2.1: GraphQL Mutation Injection
**Description:** Malicious mutations modify data without authorization
**Attack Vector:** Crafted GraphQL mutations exploiting weak authorization
**DREAD Score:**
- Damage: 9 (Data corruption)
- Reproducibility: 7 (Requires bypass)
- Exploitability: 6 (Needs schema knowledge)
- Affected Users: 9 (Wide impact)
- Discoverability: 7 (Schema introspection)
- **Total: 7.6 (HIGH)**

**Existing Mitigation:**
- Policy guard middleware
- Resolver-level authorization

**Required Mitigation:**
- Disable introspection in production (currently only dev)
- Implement field-level authorization
- Add mutation input validation with strict schemas
- Log all mutations with user context
- Implement optimistic locking for concurrent updates

**SOC 2 Mapping:** CC6.2, CC8.1, PI1.2

**Gap Status:** ⚠️ PARTIAL - Introspection enabled based on NODE_ENV

---

#### Threat 2.2: Policy Bypass via DryRun Mode
**Description:** Policy enforcement disabled in DryRun mode allows violations
**Attack Vector:** Environment variable manipulation (POLICY_DRY_RUN=true)
**DREAD Score:**
- Damage: 8 (Policy violations)
- Reproducibility: 9 (If env access)
- Exploitability: 5 (Requires env access)
- Affected Users: 10 (All users)
- Discoverability: 4 (Needs code access)
- **Total: 7.2 (HIGH)**

**Existing Mitigation:**
- Environment-based configuration

**Required Mitigation:**
- Remove DryRun mode from production deployments
- Implement deployment environment validation
- Add runtime environment checks
- Audit policy enforcement status in logs

**SOC 2 Mapping:** CC6.2, CC7.2, PI1.1

**Gap Status:** 🔴 CRITICAL GAP - DryRun mode accessible in production

---

### R - Repudiation

#### Threat 3.1: Missing Audit Trail
**Description:** Actions cannot be traced to specific users
**Attack Vector:** Insufficient logging of GraphQL operations
**DREAD Score:**
- Damage: 7 (Forensic impact)
- Reproducibility: 10 (Always present)
- Exploitability: 1 (N/A - logging issue)
- Affected Users: 5 (Indirect)
- Discoverability: 8 (Obvious gap)
- **Total: 6.2 (MEDIUM)**

**Existing Mitigation:**
- Logger configured in Apollo Server

**Required Mitigation:**
- Log all GraphQL operations with:
  - User identity
  - Timestamp
  - Operation type (query/mutation)
  - Variables and arguments
  - IP address
  - Result status
- Implement tamper-evident logging
- Send logs to SIEM
- Retention for 7 years (compliance)

**SOC 2 Mapping:** CC4.1, CC7.3, A1.2

**Gap Status:** ⚠️ PARTIAL - Need comprehensive audit logging

---

### I - Information Disclosure

#### Threat 4.1: GraphQL Schema Leakage
**Description:** Schema introspection reveals system internals
**Attack Vector:** Introspection queries in production
**DREAD Score:**
- Damage: 5 (Information leakage)
- Reproducibility: 10 (Always available)
- Exploitability: 10 (Trivial)
- Affected Users: 10 (All)
- Discoverability: 10 (Standard feature)
- **Total: 9.0 (CRITICAL)**

**Existing Mitigation:**
- Introspection controlled by NODE_ENV

**Required Mitigation:**
- Disable introspection in production
- Use schema allow-listing
- Implement query complexity limits
- Add depth limiting to prevent deep nesting

**SOC 2 Mapping:** C1.1, CC6.7

**Gap Status:** ✅ CONTROLLED - Disabled in production

---

#### Threat 4.2: Verbose Error Messages
**Description:** Error messages expose stack traces and internal paths
**Attack Vector:** Malformed queries trigger detailed errors
**DREAD Score:**
- Damage: 4 (Information leakage)
- Reproducibility: 8 (Easy to trigger)
- Exploitability: 6 (Aids other attacks)
- Affected Users: 10 (All)
- Discoverability: 9 (Common testing)
- **Total: 7.4 (HIGH)**

**Existing Mitigation:**
- Custom logger

**Required Mitigation:**
- Implement custom error formatter
- Return generic errors to clients
- Log detailed errors server-side only
- Remove stack traces in production
- Sanitize error messages

**SOC 2 Mapping:** C1.1, CC6.7

**Gap Status:** 🔴 CRITICAL GAP - Need error sanitization

---

#### Threat 4.3: CORS Misconfiguration
**Description:** Overly permissive CORS allows credential theft
**Attack Vector:** Malicious site reads API responses
**DREAD Score:**
- Damage: 7 (Data exfiltration)
- Reproducibility: 8 (If misconfigured)
- Exploitability: 7 (Common attack)
- Affected Users: 8 (User impact)
- Discoverability: 9 (Easy to test)
- **Total: 7.8 (HIGH)**

**Existing Mitigation:**
- CORS configured with origin and credentials

**Required Mitigation:**
- Use explicit allowed origins (no wildcards with credentials)
- Validate origin header server-side
- Implement pre-flight request validation
- Regular CORS configuration audits

**SOC 2 Mapping:** CC6.6, CC6.7

**Gap Status:** ✅ CONTROLLED - Origin from env variable

---

### D - Denial of Service

#### Threat 5.1: GraphQL Query Complexity Attack
**Description:** Deeply nested or expensive queries exhaust resources
**Attack Vector:** Maliciously crafted GraphQL queries
**DREAD Score:**
- Damage: 8 (Service outage)
- Reproducibility: 9 (Easy to craft)
- Exploitability: 9 (No auth needed)
- Affected Users: 10 (All users)
- Discoverability: 8 (Well-known attack)
- **Total: 8.8 (CRITICAL)**

**Existing Mitigation:**
- None identified

**Required Mitigation:**
- Implement query complexity analysis
- Set maximum query depth (limit: 7)
- Add query cost calculation
- Implement per-user rate limiting
- Set timeout for all operations (max: 30s)
- Add field complexity scoring

**SOC 2 Mapping:** A1.1, A1.2

**Gap Status:** 🔴 CRITICAL GAP - No query complexity limits

---

#### Threat 5.2: Batch Query Flooding
**Description:** Multiple queries in single request overwhelm server
**Attack Vector:** Batched GraphQL operations
**DREAD Score:**
- Damage: 7 (Performance degradation)
- Reproducibility: 9 (Easy to send)
- Exploitability: 9 (No limits)
- Affected Users: 10 (All users)
- Discoverability: 7 (Requires testing)
- **Total: 8.4 (CRITICAL)**

**Existing Mitigation:**
- None identified

**Required Mitigation:**
- Limit batch size (max: 10 queries)
- Implement request size limits
- Add connection pooling
- Implement circuit breakers

**SOC 2 Mapping:** A1.1, A1.2

**Gap Status:** 🔴 CRITICAL GAP - No batch limits

---

### E - Elevation of Privilege

#### Threat 6.1: Authorization Bypass via Direct Resolver Access
**Description:** Weak resolver authorization allows privilege escalation
**Attack Vector:** Crafted queries access restricted resolvers
**DREAD Score:**
- Damage: 10 (Admin access)
- Reproducibility: 6 (Depends on implementation)
- Exploitability: 7 (Requires schema knowledge)
- Affected Users: 10 (All users)
- Discoverability: 6 (Needs testing)
- **Total: 7.8 (HIGH)**

**Existing Mitigation:**
- Policy guard middleware
- Authorization in resolvers

**Required Mitigation:**
- Implement consistent authorization checks in all resolvers
- Use directive-based authorization (@auth, @roles)
- Implement least privilege principle
- Add authorization testing in CI/CD
- Regular authorization reviews

**SOC 2 Mapping:** CC6.2, CC6.3

**Gap Status:** ⚠️ PARTIAL - Need directive-based auth

---

#### Threat 6.2: Helmet Middleware Disabled
**Description:** Security headers not set, enabling various attacks
**Attack Vector:** XSS, clickjacking, MIME sniffing
**DREAD Score:**
- Damage: 7 (Various attacks)
- Reproducibility: 10 (Always disabled)
- Exploitability: 8 (Common attacks)
- Affected Users: 10 (All users)
- Discoverability: 10 (Code shows commented)
- **Total: 9.0 (CRITICAL)**

**Existing Mitigation:**
- None (commented out: `// app.use(helmet())`)

**Required Mitigation:**
- Enable Helmet middleware immediately
- Configure CSP headers
- Enable HSTS
- Set X-Frame-Options
- Enable XSS protection
- Disable X-Powered-By

**SOC 2 Mapping:** CC6.6, CC6.7

**Gap Status:** 🔴 CRITICAL GAP - Helmet disabled

---

## Summary of Findings

### Critical Gaps (Immediate Action Required)
1. **Helmet middleware disabled** - No security headers
2. **Policy DryRun mode in production** - Policy bypass possible
3. **No query complexity limits** - DoS vulnerability
4. **No batch query limits** - DoS vulnerability
5. **Verbose error messages** - Information disclosure

### High Priority Gaps
1. Partial authentication enforcement
2. Missing refresh token implementation
3. Introspection partially controlled
4. Missing comprehensive audit logging
5. Authorization not directive-based

### Medium Priority Gaps
1. Need enhanced monitoring
2. Need regular security audits
3. Need penetration testing

### Compliance Impact
- **SOC 2 Security:** 8 gaps affecting CC6.x controls
- **SOC 2 Availability:** 2 critical DoS vulnerabilities
- **SOC 2 Confidentiality:** 3 information disclosure risks

---

## Recommendations

### Immediate Actions (Week 1)
1. Enable Helmet middleware
2. Disable Policy DryRun in production
3. Implement query complexity analysis
4. Add batch query limits
5. Sanitize error messages

### Short-term Actions (Month 1)
1. Implement refresh token rotation
2. Add comprehensive audit logging
3. Implement directive-based authorization
4. Add rate limiting
5. Complete authentication enforcement review

### Long-term Actions (Quarter 1)
1. Regular security audits
2. Penetration testing
3. Security training for developers
4. Implement automated security testing
5. Establish security metrics dashboard

---

## Approval and Sign-off

**Reviewed By:** _____________________
**Date:** _____________________
**Next Review:** 2026-03-27 (Quarterly)
