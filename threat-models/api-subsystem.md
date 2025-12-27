# Threat Model: API Subsystem

> **Version**: 1.0
> **Last Updated**: 2025-12-27
> **Status**: Production
> **Owner**: Security Architecture Team
> **SOC 2 Controls**: CC6.1, CC6.6, CC6.7, CC7.1

## 1. System Overview

The API Subsystem provides REST and GraphQL interfaces for client applications, handling authentication, rate limiting, and request routing.

### Components

- **Express.js Server**: HTTP request handling
- **Apollo GraphQL**: GraphQL query processing
- **API Gateway**: Request routing and authentication
- **Rate Limiter**: Request throttling
- **Validation Middleware**: Input validation (Zod)

### Data Flows

- Client → API Gateway → Governance → Application Services
- GraphQL queries with nested resolvers
- WebSocket connections for real-time updates

---

## 2. Threat Catalog

### THREAT-API-001: Injection Attacks (SQL/Cypher/GraphQL)

**Description**: Attacker injects malicious queries through API inputs.

**STRIDE Category**: Tampering, Information Disclosure

**Risk Level**: CRITICAL

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Input Validation | Zod schema validation on all inputs | ✅ Implemented |
| Parameterized Queries | No string concatenation in queries | ✅ Implemented |
| GraphQL Depth Limiting | Max query depth = 10 | ✅ Implemented |
| Cypher Sandbox | Whitelist allowed Cypher operations | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-API-002: Authentication Bypass

**Description**: Attacker bypasses JWT validation to access protected endpoints.

**STRIDE Category**: Spoofing, Elevation of Privilege

**Risk Level**: CRITICAL

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| JWT Validation | Verify signature, expiry, issuer | ✅ Implemented |
| Token Rotation | Short-lived access tokens (1h) | ✅ Implemented |
| Refresh Token Security | Rotate refresh tokens on use | ✅ Implemented |
| Auth Middleware | Applied to all /api routes | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-API-003: Rate Limit Bypass

**Description**: Attacker exhausts resources by bypassing rate limits.

**STRIDE Category**: Denial of Service

**Risk Level**: HIGH

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Tiered Rate Limiting | User, tenant, and IP-based limits | ✅ Implemented |
| Distributed Rate Store | Redis-backed for cluster consistency | ✅ Implemented |
| Request Fingerprinting | Detect distributed attacks | ✅ Implemented |
| Circuit Breaker | Fail-fast on overload | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-API-004: GraphQL Complexity Attack

**Description**: Attacker crafts expensive GraphQL queries to exhaust resources.

**STRIDE Category**: Denial of Service

**Risk Level**: MEDIUM

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Query Complexity Analysis | Cost-based query limits | ✅ Implemented |
| Depth Limiting | Max depth = 10 | ✅ Implemented |
| Field Count Limiting | Max 100 fields per query | ✅ Implemented |
| Query Timeout | 30s max execution time | ✅ Implemented |
| Persisted Queries | APQ in production | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-API-005: CORS Misconfiguration

**Description**: Attacker exploits permissive CORS to perform cross-origin attacks.

**STRIDE Category**: Information Disclosure

**Risk Level**: MEDIUM

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Strict Origin Allowlist | Only trusted origins allowed | ✅ Implemented |
| Credentials Restriction | credentials: true only for allowlisted | ✅ Implemented |
| Preflight Caching | OPTIONS responses cached | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-API-006: API Version Downgrade Attack

**Description**: Attacker forces use of deprecated API version with known vulnerabilities.

**STRIDE Category**: Tampering

**Risk Level**: MEDIUM

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Version Validation | Reject unsupported versions | ✅ Implemented |
| Deprecation Headers | Sunset headers for deprecated versions | ✅ Implemented |
| Minimum Version Enforcement | requireMinVersion() middleware | ✅ Implemented |
| Version Logging | Track version usage in analytics | ✅ Implemented |

**Residual Risk**: LOW

---

## 3. Security Controls Summary

| Control Category | Implemented | Planned | Total  |
| ---------------- | ----------- | ------- | ------ |
| Input Validation | 5           | 0       | 5      |
| Authentication   | 4           | 0       | 4      |
| Rate Limiting    | 4           | 0       | 4      |
| Query Protection | 5           | 0       | 5      |
| **TOTAL**        | **18**      | **0**   | **18** |

---

## 4. References

- [ARCHITECTURE.md](../docs/ga/ARCHITECTURE.md)
- [API Versioning](../server/src/routes/api-versioning.ts)
- [Validation Middleware](../server/src/middleware/validation.ts)
