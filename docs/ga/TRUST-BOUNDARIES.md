# GA Trust Boundaries

> **Version**: 1.0
> **Last Updated**: 2025-12-27
> **Status**: Production
> **Audience**: Security Engineers, Architects, Auditors

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Trust Domain Definitions](#trust-domain-definitions)
3. [Boundary Crossing Protocols](#boundary-crossing-protocols)
4. [Authentication at Boundaries](#authentication-at-boundaries)
5. [Authorization at Boundaries](#authorization-at-boundaries)
6. [Data Transformation Rules](#data-transformation-rules)
7. [Monitoring and Alerts](#monitoring-and-alerts)
8. [Boundary Violation Response](#boundary-violation-response)

---

## Executive Summary

The GA (Governance & Attestation) system implements a **zero-trust architecture** with multiple security boundaries. Each boundary represents a **trust transition** where security controls are enforced.

### Key Principles

1. **Explicit Trust Levels**: Every component has a defined trust level (0-6)
2. **Mandatory Security Controls**: Crossing boundaries requires authentication, authorization, and audit
3. **Least Privilege**: Components have minimal permissions required for their function
4. **Defense in Depth**: Multiple overlapping security layers
5. **Continuous Verification**: Trust is never implicit; always verified

### Trust Hierarchy

```
Trust Level 0: Public Internet (Untrusted)
    ↓ [TLS + WAF]
Trust Level 1: DMZ (Basic Filtering)
    ↓ [JWT Validation]
Trust Level 2: API Gateway (Authenticated)
    ↓ [Policy Evaluation]
Trust Level 3: Governance Layer (Authorized)
    ↓ [Service Identity]
Trust Level 4: Application Services (Service-Authorized)
    ↓ [Database Auth + Encryption]
Trust Level 5: Data Layer (Data Access)
    ↓ [Admin MFA + VPN]
Trust Level 6: Admin Zone (Infrastructure Access)
```

---

## Trust Domain Definitions

### Domain 0: Public Internet

**Trust Level**: 0 (Untrusted)

**Description**: The public internet is completely untrusted. All traffic from this domain is considered hostile until proven otherwise.

**Components**:

- End-user browsers
- External API clients
- Third-party integrations
- Attackers

**Security Posture**:

- ❌ No implicit trust
- ❌ No direct access to internal systems
- ❌ No authentication required (yet)

**Threat Model**:

- DDoS attacks
- SQL injection attempts
- XSS attacks
- Credential stuffing
- Man-in-the-middle attacks

---

### Domain 1: DMZ (Perimeter Network)

**Trust Level**: 1 (Basic Filtering)

**Description**: The DMZ provides basic perimeter security. Traffic has been filtered by a web application firewall (WAF) but is still untrusted.

**Components**:

- Load balancer (TLS termination)
- Web Application Firewall (WAF)
- DDoS mitigation service
- Rate limiters

**Security Posture**:

- ✅ TLS encryption enforced
- ✅ Basic attack signatures blocked (WAF)
- ✅ DDoS mitigation active
- ❌ Not yet authenticated

**Threat Model**:

- Application-layer attacks
- Protocol exploits
- Certificate validation bypasses

**Security Controls**:

```yaml
TLS Requirements:
  - Minimum Version: TLS 1.3
  - Cipher Suites: Only AEAD ciphers (AES-GCM, ChaCha20-Poly1305)
  - Certificate Validation: Strict (no self-signed)
  - HSTS: Enabled (max-age: 31536000)

WAF Rules:
  - OWASP Top 10 protection
  - SQL injection signatures
  - XSS filtering
  - Command injection blocking
  - File upload restrictions
```

---

### Domain 2: API Gateway

**Trust Level**: 2 (Authenticated)

**Description**: Traffic has been authenticated via OIDC/JWT. The user's identity is known, but authorization has not yet been evaluated.

**Components**:

- API Gateway (Kong, Ambassador, or custom)
- JWT validator
- Rate limiter (per-user)
- Request logging

**Security Posture**:

- ✅ User identity verified
- ✅ JWT signature validated
- ✅ Token expiration checked
- ❌ Not yet authorized for specific resources

**Threat Model**:

- Stolen JWTs
- JWT replay attacks
- Privilege escalation attempts
- Resource enumeration

**Security Controls**:

```yaml
JWT Validation:
  - Algorithm: RS256, ES256 (no HS256)
  - Issuer: Verified against trusted OIDC provider
  - Audience: api.intelgraph.internal
  - Expiration: Max 1 hour
  - Nonce: Required (replay protection)
  - Claims Required: sub, email, roles, clearances

Rate Limiting:
  - Per User: 100 req/min
  - Per IP: 1000 req/min
  - Burst: 20 requests
```

---

### Domain 3: Governance Layer

**Trust Level**: 3 (Authorized)

**Description**: User has been authorized for the requested action via OPA policy evaluation. High-risk operations may still require human approval.

**Components**:

- OPA policy engine
- Attestation verifier
- Approval workflow service
- Audit service (ingestion)

**Security Posture**:

- ✅ User identity verified
- ✅ Policy evaluation passed (ALLOW decision)
- ✅ Attestation verified (if required)
- ✅ Audit trail created
- ⚠️ May require human approval (DEFER_TO_HUMAN)

**Threat Model**:

- Policy bypass attempts
- Attestation forgery
- Approval workflow manipulation
- Audit log tampering

**Security Controls**:

```yaml
Policy Evaluation:
  - Engine: OPA v0.58+
  - Policy Bundle: Signed with Ed25519
  - Cache TTL: 60s
  - Failure Mode: DENY

Attestation Verification:
  - Signature Algorithm: Ed25519, RSA-PSS
  - Certificate Validation: Full chain
  - Timestamp Validation: ±5 minutes
  - Failure Mode: DENY

Audit Logging:
  - Mode: Synchronous (blocking)
  - Signature: Ed25519
  - Storage: Append-only PostgreSQL
```

---

### Domain 4: Application Services

**Trust Level**: 4 (Service-Authorized)

**Description**: Request has passed governance checks and is now being processed by application services. Services communicate via mTLS.

**Components**:

- Entity service
- Relationship service
- Graph service
- Export service
- Analytics service

**Security Posture**:

- ✅ Governance checks passed
- ✅ Service identity verified (mTLS)
- ✅ Authorized for service-to-service communication
- ✅ Network policies enforced

**Threat Model**:

- Service impersonation
- Lateral movement
- Data exfiltration
- Privilege escalation

**Security Controls**:

```yaml
Service Identity:
  - Protocol: mTLS (mutual TLS)
  - Certificate Authority: Internal PKI
  - Certificate Lifetime: 24 hours (auto-rotated)
  - Certificate SAN: service-name.namespace.svc.cluster.local

Network Policies:
  - Default: Deny all ingress/egress
  - Allowlist: Explicit service-to-service rules
  - Egress: Only to data layer and external APIs
```

---

### Domain 5: Data Layer

**Trust Level**: 5 (Data Access)

**Description**: Direct database access. Only application services and admin tools can reach this layer.

**Components**:

- Neo4j (graph database)
- PostgreSQL (relational database)
- Redis (cache)
- S3 (object storage)

**Security Posture**:

- ✅ Database authentication required
- ✅ TLS encryption enforced
- ✅ Network segmentation (isolated subnet)
- ✅ Audit logging enabled

**Threat Model**:

- SQL injection (application-layer)
- Credential theft
- Data exfiltration
- Backup compromise

**Security Controls**:

```yaml
Database Authentication:
  - PostgreSQL: SCRAM-SHA-256
  - Neo4j: Native auth + TLS
  - Redis: TLS + AUTH

Encryption:
  - In Transit: TLS 1.3
  - At Rest: AES-256-GCM
  - Key Management: Cloud KMS

Network Segmentation:
  - Subnet: 10.0.100.0/24 (isolated)
  - Ingress: Only from application services
  - Egress: None (no internet access)
```

---

### Domain 6: Admin Zone

**Trust Level**: 6 (Infrastructure Access)

**Description**: Administrative access to infrastructure. Highest privilege level, requiring MFA and VPN.

**Components**:

- Kubernetes control plane
- Database admin tools
- SSH bastion hosts
- Infrastructure-as-code (Terraform)

**Security Posture**:

- ✅ Admin authentication (MFA)
- ✅ VPN required
- ✅ Audit logging (all commands)
- ✅ Session recording

**Threat Model**:

- Compromised admin credentials
- Insider threats
- Misconfigurations
- Privilege abuse

**Security Controls**:

```yaml
Admin Authentication:
  - MFA: Required (TOTP or hardware token)
  - VPN: Required (WireGuard or IPSec)
  - Session Timeout: 15 minutes idle
  - Re-authentication: Every 4 hours

Audit Logging:
  - Commands: All (bash history, kubectl, etc.)
  - File Access: All reads/writes
  - Shipping: Real-time to SIEM
  - Retention: 7 years
```

---

## Boundary Crossing Protocols

### Boundary 0→1: Internet to DMZ

**Purpose**: Initial traffic filtering

**Protocol**:

1. Client initiates TLS connection
2. Load balancer performs TLS handshake
3. WAF inspects HTTP request
4. Rate limiter checks request count
5. Forward to API Gateway (if allowed)

**Decision Matrix**:
| Condition | Action |
|-----------|--------|
| Valid TLS handshake | ✅ Continue |
| WAF rule triggered | ❌ Block (403) |
| Rate limit exceeded | ❌ Block (429) |
| DDoS detected | ❌ Block (503) |

**Monitoring**:

- Metric: `dmz_requests_total` (counter)
- Metric: `dmz_blocks_total{reason="waf|rate_limit|ddos"}` (counter)
- Alert: `dmz_block_rate > 100/s` (potential attack)

---

### Boundary 1→2: DMZ to API Gateway

**Purpose**: User authentication

**Protocol**:

1. Extract JWT from `Authorization: Bearer <token>` header
2. Validate JWT signature (RS256)
3. Verify issuer, audience, expiration
4. Extract claims (user ID, roles, clearances)
5. Attach claims to request context
6. Forward to Governance Layer

**Decision Matrix**:
| Condition | Action |
|-----------|--------|
| Valid JWT signature | ✅ Continue |
| JWT expired | ❌ Block (401) |
| Invalid issuer | ❌ Block (401) |
| Missing required claims | ❌ Block (401) |

**Monitoring**:

- Metric: `api_gateway_auth_total{result="success|failure"}` (counter)
- Metric: `api_gateway_jwt_expiration_seconds` (histogram)
- Alert: `api_gateway_auth_failure_rate > 5%` (potential attack)

---

### Boundary 2→3: API Gateway to Governance Layer

**Purpose**: Authorization (policy evaluation)

**Protocol**:

1. Build policy input document:
   ```json
   {
     "user": {"id": "...", "roles": [...], "clearances": [...]},
     "action": "entity.read",
     "resource": {"id": "...", "type": "...", "classification": "..."},
     "context": {"ip": "...", "time": "...", "correlation_id": "..."}
   }
   ```
2. Send to OPA: `POST /v1/data/intelgraph/authz/allow`
3. Parse OPA response: `{"result": true/false, "reason": "..."}`
4. If attestation required, verify signatures
5. If approval required, create approval workflow
6. Log decision to audit service
7. Return `GovernanceVerdict`

**Decision Matrix**:
| Condition | Action |
|-----------|--------|
| OPA returns `allow = true` | ✅ Continue |
| OPA returns `allow = false` | ❌ Block (403) |
| OPA returns `defer_to_human = true` | ⏸️ Defer (202) |
| OPA unreachable | ❌ Block (503) |
| Attestation invalid | ❌ Block (403) |

**Monitoring**:

- Metric: `governance_policy_evaluation_total{decision="allow|deny|defer"}` (counter)
- Metric: `governance_policy_evaluation_duration_seconds` (histogram)
- Alert: `governance_policy_evaluation_p99 > 20ms` (performance degradation)

---

### Boundary 3→4: Governance Layer to Application Services

**Purpose**: Service-to-service authentication

**Protocol**:

1. Governance layer attaches service identity certificate (mTLS)
2. Application service validates certificate chain
3. Application service checks network policy (Kubernetes)
4. Application service processes request
5. Application service returns response

**Decision Matrix**:
| Condition | Action |
|-----------|--------|
| Valid mTLS certificate | ✅ Continue |
| Certificate expired | ❌ Block (connection refused) |
| Network policy violation | ❌ Block (connection refused) |

**Monitoring**:

- Metric: `service_mtls_auth_total{result="success|failure"}` (counter)
- Metric: `service_network_policy_blocks_total` (counter)
- Alert: `service_mtls_auth_failure_rate > 1%` (certificate rotation issue)

---

### Boundary 4→5: Application Services to Data Layer

**Purpose**: Database authentication and encryption

**Protocol**:

1. Application service connects to database (TLS)
2. Database validates application credentials (SCRAM-SHA-256)
3. Database checks network policy (source IP)
4. Database processes query
5. Database returns encrypted result (TLS)

**Decision Matrix**:
| Condition | Action |
|-----------|--------|
| Valid credentials | ✅ Continue |
| Invalid credentials | ❌ Block (connection refused) |
| Network policy violation | ❌ Block (connection refused) |
| Query timeout | ❌ Block (timeout) |

**Monitoring**:

- Metric: `database_connections_total{result="success|failure"}` (counter)
- Metric: `database_query_duration_seconds` (histogram)
- Alert: `database_connection_failure_rate > 5%` (credential or network issue)

---

### Boundary 5→6: Data Layer to Admin Zone

**Purpose**: Administrative access control

**Protocol**:

1. Admin authenticates with MFA
2. Admin connects to VPN
3. Admin accesses bastion host
4. Bastion host validates admin identity
5. Bastion host logs all commands
6. Admin accesses database (read-only unless approved)

**Decision Matrix**:
| Condition | Action |
|-----------|--------|
| Valid MFA token | ✅ Continue |
| Invalid MFA token | ❌ Block (401) |
| No VPN connection | ❌ Block (network unreachable) |
| Unapproved write operation | ❌ Block (403) |

**Monitoring**:

- Metric: `admin_access_total{result="success|failure"}` (counter)
- Metric: `admin_session_duration_seconds` (histogram)
- Alert: `admin_access_failure_rate > 10%` (potential attack)

---

## Authentication at Boundaries

### User Authentication (Boundary 1→2)

**Method**: OpenID Connect (OIDC) with JWT tokens

**Flow**:

```
┌──────┐                    ┌─────────┐                  ┌────────┐
│Client│                    │OIDC     │                  │API     │
│      │                    │Provider │                  │Gateway │
└───┬──┘                    └────┬────┘                  └────┬───┘
    │                            │                            │
    ├─1. Redirect to login────→  │                            │
    │                            │                            │
    │←─2. Login page────────────┤                            │
    │                            │                            │
    ├─3. Submit credentials────→ │                            │
    │                            │                            │
    │←─4. Authorization code────┤                            │
    │                            │                            │
    ├─5. Exchange code for JWT─→│                            │
    │                            │                            │
    │←─6. JWT token─────────────┤                            │
    │                            │                            │
    ├─7. API request + JWT──────┼──────────────────────────→ │
    │                            │                            │
    │                            │←─8. Validate JWT──────────┤
    │                            │                            │
    │                            ├─9. JWT valid──────────────→│
    │                            │                            │
    │←─10. API response──────────┼────────────────────────────┤
```

**Token Structure**:

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-2025-12-27"
  },
  "payload": {
    "iss": "https://oidc.intelgraph.internal",
    "sub": "user-123",
    "aud": "api.intelgraph.internal",
    "exp": 1735304400,
    "iat": 1735300800,
    "email": "john.doe@intelgraph.internal",
    "roles": ["analyst", "user"],
    "clearances": ["TS", "S", "C", "U"],
    "nonce": "abc123xyz"
  },
  "signature": "..."
}
```

---

### Service Authentication (Boundary 3→4)

**Method**: Mutual TLS (mTLS)

**Flow**:

```
┌───────────┐                           ┌─────────────┐
│Governance │                           │Application  │
│Service    │                           │Service      │
└─────┬─────┘                           └──────┬──────┘
      │                                        │
      ├─1. TLS Client Hello (with cert)─────→ │
      │                                        │
      │←─2. TLS Server Hello (with cert)──────┤
      │                                        │
      ├─3. Verify server cert─────────────────│
      │                                        │
      │────────────────────────4. Verify client cert
      │                                        │
      ├─5. Encrypted request─────────────────→│
      │                                        │
      │←─6. Encrypted response─────────────────┤
```

**Certificate Structure**:

```yaml
Subject: CN=governance-service.governance.svc.cluster.local
Issuer: CN=IntelGraph Internal CA
Validity:
  Not Before: 2025-12-27 00:00:00 UTC
  Not After: 2025-12-28 00:00:00 UTC (24h lifetime)
Subject Alternative Names:
  - DNS: governance-service.governance.svc.cluster.local
  - DNS: governance-service.governance.svc
  - DNS: governance-service
Extended Key Usage:
  - TLS Web Server Authentication
  - TLS Web Client Authentication
```

---

## Authorization at Boundaries

### Policy-Based Authorization (Boundary 2→3)

**Input Document**:

```json
{
  "user": {
    "id": "user-123",
    "email": "john.doe@intelgraph.internal",
    "roles": ["analyst"],
    "clearances": ["TS", "S", "C", "U"],
    "compartments": ["ALPHA", "BRAVO"]
  },
  "action": "entity.read",
  "resource": {
    "id": "entity-456",
    "type": "Person",
    "classification": "S",
    "compartments": ["ALPHA"],
    "owner": "team-intel"
  },
  "context": {
    "ip": "10.0.10.123",
    "timestamp": "2025-12-27T10:30:00Z",
    "correlation_id": "req-123-456",
    "user_agent": "IntelGraph-Client/1.0"
  }
}
```

**Policy Evaluation**:

```rego
package intelgraph.authz

# Allow if user has sufficient clearance
allow if {
  input.action == "entity.read"
  user_clearance_sufficient
  user_compartment_authorized
}

user_clearance_sufficient if {
  clearance_level[input.user.clearances[_]] >= clearance_level[input.resource.classification]
}

user_compartment_authorized if {
  input.resource.compartments[_] == input.user.compartments[_]
}

clearance_level := {
  "U": 0,
  "C": 1,
  "S": 2,
  "TS": 3,
  "TS/SCI": 4
}
```

---

## Data Transformation Rules

### Redaction at Boundaries

**Rule**: Data classification determines redaction at each boundary.

**Example**: Returning entity to user without sufficient clearance

**Original Entity** (Trust Level 5):

```json
{
  "id": "entity-123",
  "type": "Person",
  "name": "John Doe",
  "classification": "TS",
  "ssn": "123-45-6789",
  "address": "123 Secret St, Classified City",
  "phone": "+1-555-123-4567",
  "notes": "Source for Operation DELTA"
}
```

**Redacted Entity** (Trust Level 2, user has only "S" clearance):

```json
{
  "id": "entity-123",
  "type": "Person",
  "name": "[REDACTED: TS]",
  "classification": "TS",
  "ssn": "[REDACTED: TS]",
  "address": "[REDACTED: TS]",
  "phone": "[REDACTED: TS]",
  "notes": "[REDACTED: TS]"
}
```

**Implementation**:

```typescript
function redactEntity(entity: Entity, userClearance: string): Entity {
  const clearanceLevel = getClearanceLevel(userClearance);
  const resourceLevel = getClearanceLevel(entity.classification);

  if (clearanceLevel < resourceLevel) {
    return {
      ...entity,
      name: `[REDACTED: ${entity.classification}]`,
      ssn: `[REDACTED: ${entity.classification}]`,
      address: `[REDACTED: ${entity.classification}]`,
      phone: `[REDACTED: ${entity.classification}]`,
      notes: `[REDACTED: ${entity.classification}]`,
    };
  }

  return entity;
}
```

---

## Monitoring and Alerts

### Boundary Crossing Metrics

```yaml
# Prometheus metrics
metrics:
  - name: boundary_crossing_total
    type: counter
    labels: [from_domain, to_domain, result]
    description: Total boundary crossings

  - name: boundary_crossing_duration_seconds
    type: histogram
    labels: [from_domain, to_domain]
    description: Boundary crossing duration

  - name: boundary_auth_failures_total
    type: counter
    labels: [from_domain, to_domain, reason]
    description: Authentication failures at boundaries

  - name: boundary_authz_failures_total
    type: counter
    labels: [from_domain, to_domain, reason]
    description: Authorization failures at boundaries
```

### Alerts

```yaml
# Alertmanager rules
alerts:
  - name: HighBoundaryAuthFailureRate
    expr: |
      rate(boundary_auth_failures_total[5m]) > 10
    severity: warning
    annotations:
      summary: High authentication failure rate at boundary
      description: >
        Boundary {{ $labels.from_domain }} → {{ $labels.to_domain }}
        has {{ $value }} auth failures/sec (threshold: 10/sec)

  - name: BoundaryCrossingLatency
    expr: |
      histogram_quantile(0.99, boundary_crossing_duration_seconds) > 1
    severity: warning
    annotations:
      summary: High boundary crossing latency
      description: >
        p99 latency for {{ $labels.from_domain }} → {{ $labels.to_domain }}
        is {{ $value }}s (threshold: 1s)
```

---

## Boundary Violation Response

### Incident Response Plan

**Phase 1: Detection**

- Alert fired (boundary auth failure, unusual crossing pattern)
- Security team notified via PagerDuty

**Phase 2: Investigation**

- Review audit logs for affected boundary
- Identify source of violation (user, service, IP)
- Determine if violation is malicious or misconfiguration

**Phase 3: Containment**

- Block offending IP/user/service
- Rotate compromised credentials
- Isolate affected services (network policy)

**Phase 4: Remediation**

- Fix misconfiguration (if applicable)
- Patch vulnerabilities (if exploit)
- Update policies to prevent recurrence

**Phase 5: Recovery**

- Restore normal operations
- Monitor for recurrence

**Phase 6: Post-Incident Review**

- Root cause analysis
- Update runbooks
- Improve detection/prevention

---

## References

- [Architecture Documentation](./ARCHITECTURE.md)
- [Governance Design](./GOVERNANCE-DESIGN.md)
- [API Reference](./API-REFERENCE.md)
- [NIST Zero Trust Architecture (SP 800-207)](https://csrc.nist.gov/publications/detail/sp/800-207/final)

---

**Document Control**:

- **Version**: 1.0
- **Last Reviewed**: 2025-12-27
- **Next Review**: 2026-03-27
- **Owner**: Security Architecture Team
- **Approvers**: CISO, Lead Architect
