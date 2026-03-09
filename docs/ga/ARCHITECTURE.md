# GA (Governance & Attestation) Architecture

> **Version**: 2.0
> **Last Updated**: 2025-12-27
> **Status**: Production
> **Audience**: Engineers, Architects, Security Teams

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Component Architecture](#component-architecture)
5. [Security Boundaries](#security-boundaries)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Trust Domains](#trust-domains)
8. [Integration Architecture](#integration-architecture)
9. [Storage Architecture](#storage-architecture)
10. [Network Architecture](#network-architecture)
11. [Deployment Architecture](#deployment-architecture)
12. [Performance Architecture](#performance-architecture)
13. [Monitoring & Observability](#monitoring--observability)
14. [Disaster Recovery](#disaster-recovery)

---

## Executive Summary

The **Governance & Attestation (GA)** system provides policy-driven access control and compliance verification for the IntelGraph platform. It operates as a zero-trust enforcement layer between untrusted user requests and sensitive intelligence data.

### Key Capabilities

- **Policy-as-Code Enforcement**: OPA-based policy evaluation with versioned policy bundles
- **Provenance Attestation**: Cryptographic verification of data lineage and transformations
- **Human-in-the-Loop Governance**: Structured approval workflows for high-risk operations
- **Audit Trail**: Immutable ledger of all governance decisions and attestations
- **Multi-Tenant Isolation**: IC-grade compartmentalization with ABAC controls

### Architecture Highlights

- **Separation of Concerns**: Policy evaluation, attestation, and audit are independent subsystems
- **Defense in Depth**: Multiple security boundaries with fail-safe defaults
- **Immutability**: All governance decisions are append-only and cryptographically signed
- **Scalability**: Horizontally scalable with distributed policy caches
- **Observability**: Full OpenTelemetry instrumentation with structured logging

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                          │
│  (Web UI, Mobile, CLI, External Systems)                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                 │
│  - Authentication (OIDC/JWT)                                        │
│  - Rate Limiting                                                    │
│  - Request Routing                                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE LAYER (GA)                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Policy Engine   │  │  Attestation     │  │  Audit Service   │  │
│  │  (OPA)          │  │  Verifier        │  │  (Immutable)     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Approval        │  │  Policy Bundler  │  │  Evidence        │  │
│  │  Workflow        │  │  (GitOps)        │  │  Collector       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     APPLICATION SERVICES                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Graph Service   │  │  Entity Service  │  │  Relationship    │  │
│  │  (Neo4j)        │  │  (CRUD)          │  │  Service         │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Neo4j           │  │  PostgreSQL      │  │  Redis           │  │
│  │  (Graph)         │  │  (Relational)    │  │  (Cache)         │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Provenance      │  │  Policy Bundle   │  │  Audit Ledger    │  │
│  │  Ledger          │  │  Storage (S3)    │  │  (Append-Only)   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component                | Purpose                         | Technology              | Criticality |
| ------------------------ | ------------------------------- | ----------------------- | ----------- |
| **Policy Engine**        | Evaluate access policies        | OPA                     | Critical    |
| **Attestation Verifier** | Verify data provenance          | Custom (Go/TypeScript)  | Critical    |
| **Audit Service**        | Record governance decisions     | Node.js + PostgreSQL    | Critical    |
| **Approval Workflow**    | Human-in-the-loop approvals     | Node.js + State Machine | High        |
| **Policy Bundler**       | Package and distribute policies | GitOps + OCI Registry   | High        |
| **Evidence Collector**   | Gather attestation evidence     | Node.js                 | Medium      |

---

## Architecture Principles

### 1. Zero Trust

**Principle**: Never trust, always verify.

**Implementation**:

- All requests authenticated and authorized
- No implicit trust between services
- Cryptographic verification of data provenance
- Least-privilege access by default

### 2. Defense in Depth

**Principle**: Multiple overlapping security layers.

**Implementation**:

- API Gateway authentication
- GA policy enforcement
- Service-level authorization
- Database-level access controls
- Network segmentation

### 3. Fail-Safe Defaults

**Principle**: Failures result in deny decisions.

**Implementation**:

- Policy evaluation errors → DENY
- Attestation verification failures → DENY
- Timeout on approval workflows → DENY (with notification)
- Missing policy bundles → DENY

### 4. Immutability

**Principle**: Governance decisions are append-only.

**Implementation**:

- Audit logs are immutable and cryptographically signed
- Provenance ledger is append-only
- Policy bundles are versioned and content-addressed
- No deletion of governance records (retention policies only)

### 5. Separation of Duties

**Principle**: Policy authoring, evaluation, and auditing are separate roles.

**Implementation**:

- Policy authors commit to Git (peer review required)
- Policy bundler packages and signs policies
- OPA evaluates policies (read-only)
- Audit service records decisions (independent)

### 6. Observability First

**Principle**: All governance actions are traceable and measurable.

**Implementation**:

- OpenTelemetry tracing for all requests
- Structured logging with correlation IDs
- Prometheus metrics for policy decisions
- Grafana dashboards for governance health

---

## Component Architecture

### Policy Engine (OPA)

```
┌─────────────────────────────────────────────────────────────┐
│                     Policy Engine (OPA)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Policy Bundle Cache (In-Memory)                    │   │
│  │  - Policies indexed by path                         │   │
│  │  - TTL: 60s (with background refresh)               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Evaluation Engine                                   │   │
│  │  - Rego interpreter                                  │   │
│  │  - Partial evaluation for performance                │   │
│  │  - Caching of compiled policies                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Decision Log Shipper                                │   │
│  │  - Batch ship to Audit Service                       │   │
│  │  - Buffer: 1000 decisions or 10s                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  Policy Bundle       Evaluation API        Audit Service
  Storage (S3)       (HTTP/gRPC)           (PostgreSQL)
```

**Key Features**:

- **Distributed**: Multiple OPA instances behind load balancer
- **Cached**: In-memory policy bundles with background refresh
- **Fast**: <10ms p99 latency for policy evaluation
- **Resilient**: Continues with stale policies if bundle fetch fails

**Configuration**:

```yaml
# opa-config.yaml
services:
  - name: policy-bundle-service
    url: https://policy-bundles.intelgraph.internal
    credentials:
      bearer:
        token_path: /var/run/secrets/policy-bundle-token
bundles:
  main:
    service: policy-bundle-service
    resource: bundles/main.tar.gz
    polling:
      min_delay_seconds: 60
      max_delay_seconds: 120
decision_logs:
  service: audit-service
  reporting:
    buffer_size_limit_bytes: 32768
    max_delay_seconds: 10
```

### Attestation Verifier

```
┌─────────────────────────────────────────────────────────────┐
│                  Attestation Verifier                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Signature Verifier                                  │   │
│  │  - Ed25519 / RSA-PSS                                 │   │
│  │  - X.509 certificate chain validation                │   │
│  │  - PKCS#11 HSM support                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Provenance Chain Validator                          │   │
│  │  - Verify chain of custody                           │   │
│  │  - Check for tampering                               │   │
│  │  - Validate timestamps                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SLSA Level Checker                                  │   │
│  │  - Verify build provenance (SLSA L3+)                │   │
│  │  - Check source repo integrity                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Evidence Collector                                  │   │
│  │  - Gather supporting evidence                        │   │
│  │  - Store in append-only ledger                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Verification Flow**:

1. Receive attestation bundle (data + signatures + provenance)
2. Verify cryptographic signatures
3. Validate certificate chains
4. Check provenance chain integrity
5. Evaluate SLSA level compliance
6. Collect evidence for audit
7. Return `GovernanceVerdict`

### Approval Workflow Engine

```
┌─────────────────────────────────────────────────────────────┐
│                  Approval Workflow Engine                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  State Machine                                       │   │
│  │  States: PENDING → REVIEWING → APPROVED/DENIED      │   │
│  │  Transitions: Policy-driven                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Notification Service                                │   │
│  │  - Email / Slack / PagerDuty                         │   │
│  │  - SLA tracking and escalation                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Approval Policies                                   │   │
│  │  - Required approvers (by role/clearance)            │   │
│  │  - Quorum requirements                               │   │
│  │  - Time limits                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Audit Integration                                   │   │
│  │  - Log all state transitions                         │   │
│  │  - Record approver identities                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Workflow Example**:

```typescript
// Approval workflow definition
{
  workflowId: "high-risk-entity-access",
  trigger: {
    action: "entity.read",
    condition: "input.entity.classification == 'TS/SCI'"
  },
  approvers: [
    { role: "data-owner", required: 1 },
    { role: "security-officer", required: 1 }
  ],
  quorum: 2,
  timeout: "4h",
  onTimeout: "DENY",
  notifications: [
    { channel: "email", recipients: ["approvers"], timing: "immediate" },
    { channel: "slack", recipients: ["#governance"], timing: "immediate" },
    { channel: "pagerduty", recipients: ["on-call"], timing: "2h-no-response" }
  ]
}
```

### Audit Service

```
┌─────────────────────────────────────────────────────────────┐
│                      Audit Service                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Ingestion API                                       │   │
│  │  - HTTP/gRPC endpoints                               │   │
│  │  - Batch ingestion support                           │   │
│  │  - Schema validation                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Crypto Signer                                       │   │
│  │  - Sign each audit record                            │   │
│  │  - Merkle tree for batch integrity                   │   │
│  │  - Timestamp authority integration                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Append-Only Store                                   │   │
│  │  - PostgreSQL (no DELETE/UPDATE)                     │   │
│  │  - Partitioned by time                               │   │
│  │  - Hot: 90 days, Warm: 1 year, Cold: 7 years        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Query API                                           │   │
│  │  - GraphQL interface                                 │   │
│  │  - Role-based query filtering                        │   │
│  │  - Export capabilities                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Schema**:

```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id UUID NOT NULL,
  trace_id TEXT,
  span_id TEXT,

  -- Event classification
  event_type TEXT NOT NULL, -- 'policy.evaluation', 'attestation.verification', 'approval.decision'
  severity TEXT NOT NULL CHECK (severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),

  -- Actor information
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL, -- 'user', 'service', 'system'
  actor_roles TEXT[],

  -- Resource information
  resource_type TEXT,
  resource_id TEXT,
  resource_classification TEXT,

  -- Decision information
  decision TEXT CHECK (decision IN ('ALLOW', 'DENY', 'ABSTAIN', 'DEFER_TO_HUMAN')),
  decision_reason TEXT,
  policy_version TEXT,

  -- Attestation information
  attestation_present BOOLEAN DEFAULT FALSE,
  attestation_valid BOOLEAN,
  provenance_chain_valid BOOLEAN,

  -- Approval workflow information
  approval_required BOOLEAN DEFAULT FALSE,
  approval_status TEXT,
  approvers TEXT[],

  -- Cryptographic integrity
  signature TEXT NOT NULL,
  signature_algorithm TEXT NOT NULL DEFAULT 'Ed25519',
  merkle_root TEXT,

  -- Raw data (JSONB for flexibility)
  metadata JSONB,

  -- Partitioning key
  partition_key DATE NOT NULL DEFAULT CURRENT_DATE
) PARTITION BY RANGE (partition_key);

-- Prevent updates and deletes
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutability
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

---

## Security Boundaries

### Boundary Map

```
┌────────────────────────────────────────────────────────────┐
│  INTERNET (Untrusted)                                      │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  DMZ (Trust Level: 0)                                      │
│  - Load Balancer (TLS Termination)                         │
│  - WAF (Web Application Firewall)                          │
│  - DDoS Protection                                         │
└────────────────────────┬───────────────────────────────────┘
                         │ [TLS 1.3 + mTLS]
                         ▼
┌────────────────────────────────────────────────────────────┐
│  API Gateway Zone (Trust Level: 1)                         │
│  - Authentication (OIDC/JWT)                                │
│  - Rate Limiting                                            │
│  - Request Validation                                       │
└────────────────────────┬───────────────────────────────────┘
                         │ [mTLS + JWT]
                         ▼
┌────────────────────────────────────────────────────────────┐
│  Governance Zone (Trust Level: 2)                          │
│  - Policy Evaluation (OPA)                                  │
│  - Attestation Verification                                 │
│  - Approval Workflows                                       │
└────────────────────────┬───────────────────────────────────┘
                         │ [mTLS + Service Token]
                         ▼
┌────────────────────────────────────────────────────────────┐
│  Application Zone (Trust Level: 3)                         │
│  - Entity Services                                          │
│  - Relationship Services                                    │
│  - Graph Services                                           │
└────────────────────────┬───────────────────────────────────┘
                         │ [mTLS + Encrypted Connection]
                         ▼
┌────────────────────────────────────────────────────────────┐
│  Data Zone (Trust Level: 4)                                │
│  - Neo4j (TLS + Auth)                                       │
│  - PostgreSQL (TLS + Auth)                                  │
│  - Redis (TLS + Auth)                                       │
└────────────────────────────────────────────────────────────┘
```

### Boundary Crossing Rules

#### Rule 1: Authentication Required

- **Scope**: Internet → DMZ → API Gateway
- **Enforcement**: OIDC/JWT validation at API Gateway
- **Failure Mode**: 401 Unauthorized

#### Rule 2: Policy Evaluation Required

- **Scope**: API Gateway → Governance Zone
- **Enforcement**: OPA policy evaluation
- **Failure Mode**: 403 Forbidden (logged to audit)

#### Rule 3: Attestation Verification (Conditional)

- **Scope**: Governance Zone → Application Zone
- **Enforcement**: Attestation verifier for sensitive operations
- **Failure Mode**: 403 Forbidden with attestation error

#### Rule 4: Service-to-Service Authentication

- **Scope**: All internal boundaries
- **Enforcement**: mTLS with service identity certificates
- **Failure Mode**: Connection refused

#### Rule 5: Data Encryption in Transit

- **Scope**: All zones
- **Enforcement**: TLS 1.3 minimum
- **Failure Mode**: Connection refused

---

## Data Flow Architecture

### Policy Evaluation Flow

```
1. Client Request
   │
   ├─→ [API Gateway]
   │   ├─ Validate JWT
   │   ├─ Extract claims (user_id, roles, clearances)
   │   └─ Add request metadata (IP, timestamp, correlation_id)
   │
   ├─→ [Policy Engine]
   │   ├─ Build input document:
   │   │  {
   │   │    "user": { "id": "...", "roles": [...], "clearances": [...] },
   │   │    "action": "entity.read",
   │   │    "resource": { "id": "...", "type": "...", "classification": "..." },
   │   │    "context": { "ip": "...", "time": "...", "correlation_id": "..." }
   │   │  }
   │   │
   │   ├─ Evaluate policy: data.intelgraph.authz.allow
   │   │  - Check user permissions
   │   │  - Verify classification access
   │   │  - Check temporal constraints
   │   │  - Evaluate custom rules
   │   │
   │   └─ Return decision: { "allow": true/false, "reason": "..." }
   │
   ├─→ [Attestation Verifier] (if required)
   │   ├─ Verify signatures
   │   ├─ Validate provenance chain
   │   └─ Return attestation verdict
   │
   ├─→ [Approval Workflow] (if decision == DEFER_TO_HUMAN)
   │   ├─ Create approval request
   │   ├─ Notify approvers
   │   ├─ Wait for decision (with timeout)
   │   └─ Return approval verdict
   │
   ├─→ [Audit Service]
   │   ├─ Log decision
   │   ├─ Sign record
   │   └─ Store in append-only ledger
   │
   └─→ [Response to Client]
       ├─ 200 OK (allow)
       ├─ 403 Forbidden (deny)
       └─ 202 Accepted (pending approval)
```

### Attestation Verification Flow

```
1. Client submits data with attestation
   │
   ├─→ [Attestation Bundle Parser]
   │   ├─ Extract data payload
   │   ├─ Extract signatures
   │   └─ Extract provenance chain
   │
   ├─→ [Signature Verifier]
   │   ├─ Verify data signature
   │   ├─ Check certificate chain
   │   └─ Validate timestamp
   │
   ├─→ [Provenance Chain Validator]
   │   ├─ Verify each link in chain
   │   ├─ Check for tampering
   │   └─ Validate source integrity
   │
   ├─→ [SLSA Level Checker]
   │   ├─ Check build provenance
   │   ├─ Verify source repo
   │   └─ Validate SLSA level (L3+)
   │
   ├─→ [Evidence Collector]
   │   ├─ Gather verification evidence
   │   └─ Store in provenance ledger
   │
   └─→ [GovernanceVerdict]
       ├─ approved: true/false
       ├─ reason: "..."
       ├─ evidence: [...]
       └─ slsaLevel: 3
```

### Approval Workflow Flow

```
1. High-risk operation detected
   │
   ├─→ [Workflow Matcher]
   │   ├─ Match operation to workflow definition
   │   └─ Determine required approvers
   │
   ├─→ [Workflow State Machine]
   │   ├─ Create approval request (state: PENDING)
   │   ├─ Generate approval token
   │   └─ Store in workflow database
   │
   ├─→ [Notification Service]
   │   ├─ Email approvers
   │   ├─ Post to Slack
   │   └─ Set reminder timers
   │
   ├─→ [Approver Portal]
   │   ├─ Display request details
   │   ├─ Show requester context
   │   ├─ Provide approve/deny buttons
   │   └─ Require justification text
   │
   ├─→ [Approval Decision Handler]
   │   ├─ Verify approver identity
   │   ├─ Check quorum requirements
   │   ├─ Update state (REVIEWING → APPROVED/DENIED)
   │   └─ Record decision
   │
   ├─→ [Audit Service]
   │   ├─ Log approval decision
   │   ├─ Record approver identities
   │   └─ Store justifications
   │
   └─→ [Original Request Handler]
       ├─ Resume request processing (if approved)
       └─ Return error (if denied)
```

---

## Trust Domains

### Domain Definitions

| Domain                   | Trust Level | Description                            | Access Requirements                   |
| ------------------------ | ----------- | -------------------------------------- | ------------------------------------- |
| **Public Internet**      | 0           | Untrusted external network             | None                                  |
| **DMZ**                  | 1           | Perimeter network with basic filtering | Valid TLS connection                  |
| **API Gateway**          | 2           | Authenticated but not authorized       | Valid JWT token                       |
| **Governance Layer**     | 3           | Policy-enforced access                 | Policy evaluation passed              |
| **Application Services** | 4           | Authorized service access              | Service identity certificate          |
| **Data Layer**           | 5           | Direct database access                 | Database credentials + network policy |
| **Admin Zone**           | 6           | Infrastructure management              | Admin credentials + MFA + VPN         |

### Trust Transitions

```
Trust Level 0 → 1: TLS handshake + WAF check
Trust Level 1 → 2: JWT validation + rate limit check
Trust Level 2 → 3: OPA policy evaluation (ALLOW decision)
Trust Level 3 → 4: Service identity verification (mTLS)
Trust Level 4 → 5: Database authentication + connection encryption
Trust Level 5 → 6: Admin authentication + MFA + VPN + audit
```

---

## Integration Architecture

### External System Integrations

```
┌─────────────────────────────────────────────────────────────┐
│  External Systems                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  OIDC    │  │  LDAP/AD │  │  SIEM    │  │  Ticketing│   │
│  │  Provider│  │          │  │          │  │  System   │   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘   │
└────────┼─────────────┼─────────────┼─────────────┼─────────┘
         │             │             │             │
         ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│  Integration Layer                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │  User    │  │  Event   │  │  Workflow│   │
│  │  Adapter │  │  Sync    │  │  Shipper │  │  Adapter │   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘   │
└────────┼─────────────┼─────────────┼─────────────┼─────────┘
         │             │             │             │
         ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│  GA Services                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Policy  │  │  Policy  │  │  Audit   │  │  Approval│   │
│  │  Engine  │  │  Data    │  │  Service │  │  Workflow│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Integration Patterns

#### 1. Authentication (OIDC)

- **Protocol**: OpenID Connect 1.0
- **Flow**: Authorization Code + PKCE
- **Token Format**: JWT (signed with RS256)
- **Token Lifetime**: Access: 1h, Refresh: 24h
- **Claims Required**: `sub`, `email`, `roles`, `clearances`

#### 2. User Synchronization (LDAP/AD)

- **Protocol**: LDAP v3
- **Sync Frequency**: Every 15 minutes
- **Sync Scope**: User attributes, group memberships
- **Attribute Mapping**: `cn` → `name`, `memberOf` → `roles`

#### 3. SIEM Integration

- **Protocol**: Syslog (RFC 5424) over TLS
- **Event Format**: CEF (Common Event Format)
- **Batching**: 1000 events or 30s
- **Filtering**: Configurable severity threshold

#### 4. Ticketing System (Approval Workflows)

- **Protocol**: REST API
- **Integration**: Bi-directional (create ticket, poll status)
- **Ticket Fields**: Requester, resource, justification, approvers
- **SLA Tracking**: Escalate if no response in 2 hours

---

## Storage Architecture

### Data Stores

| Store                 | Purpose                       | Technology                 | Retention | Backup                         |
| --------------------- | ----------------------------- | -------------------------- | --------- | ------------------------------ |
| **Audit Ledger**      | Immutable governance records  | PostgreSQL (append-only)   | 7 years   | Daily incremental, weekly full |
| **Provenance Ledger** | Data lineage and attestations | PostgreSQL (append-only)   | 7 years   | Daily incremental, weekly full |
| **Policy Bundles**    | Versioned policy files        | S3-compatible (MinIO/S3)   | Forever   | Versioned objects              |
| **Workflow State**    | Approval workflow state       | PostgreSQL (transactional) | 90 days   | Daily incremental              |
| **Policy Cache**      | OPA in-memory cache           | OPA (memory)               | 60s TTL   | N/A (ephemeral)                |
| **Metrics**           | Prometheus metrics            | Prometheus TSDB            | 30 days   | Weekly export to S3            |

### Data Partitioning

```sql
-- Audit events partitioned by month
CREATE TABLE audit_events_2025_12 PARTITION OF audit_events
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE audit_events_2026_01 PARTITION OF audit_events
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Automatic partition creation
CREATE OR REPLACE FUNCTION create_audit_partition()
RETURNS void AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  end_date := start_date + INTERVAL '1 month';
  partition_name := 'audit_events_' || TO_CHAR(start_date, 'YYYY_MM');

  EXECUTE FORMAT(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_events FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

---

## Network Architecture

### Network Segmentation

```
┌─────────────────────────────────────────────────────────────┐
│  Internet                                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  DMZ Network (10.0.1.0/24)                                  │
│  - Load Balancer                                            │
│  - WAF                                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Gateway Network (10.0.10.0/24)                             │
│  - API Gateway                                              │
│  - Rate Limiters                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Governance Network (10.0.20.0/24)                          │
│  - OPA Instances                                            │
│  - Attestation Verifiers                                    │
│  - Approval Workflow Services                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Application Network (10.0.30.0/24)                         │
│  - Entity Services                                          │
│  - Relationship Services                                    │
│  - Graph Services                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Network (10.0.100.0/24)                               │
│  - PostgreSQL                                               │
│  - Neo4j                                                    │
│  - Redis                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Network Policies (Kubernetes)

```yaml
# Only allow governance layer to access OPA
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: opa-ingress
  namespace: governance
spec:
  podSelector:
    matchLabels:
      app: opa
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: gateway
        - namespaceSelector:
            matchLabels:
              name: governance
      ports:
        - protocol: TCP
          port: 8181
```

---

## Deployment Architecture

### Kubernetes Deployment

```yaml
# OPA Deployment with High Availability
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa
  namespace: governance
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: opa
  template:
    metadata:
      labels:
        app: opa
        version: v1
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - opa
              topologyKey: kubernetes.io/hostname
      containers:
        - name: opa
          image: openpolicyagent/opa:0.58.0
          args:
            - "run"
            - "--server"
            - "--addr=0.0.0.0:8181"
            - "--config-file=/config/opa-config.yaml"
            - "--log-level=info"
            - "--log-format=json"
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8181
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health?bundle=true
              port: 8181
            initialDelaySeconds: 5
            periodSeconds: 5
```

---

## Performance Architecture

### SLO Targets

| Operation                        | p50    | p95    | p99    | Availability |
| -------------------------------- | ------ | ------ | ------ | ------------ |
| **Policy Evaluation**            | <5ms   | <10ms  | <20ms  | 99.95%       |
| **Attestation Verification**     | <50ms  | <100ms | <200ms | 99.9%        |
| **Approval Workflow (creation)** | <100ms | <200ms | <500ms | 99.9%        |
| **Audit Log Ingestion**          | <10ms  | <20ms  | <50ms  | 99.99%       |

### Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│  L1 Cache: OPA In-Memory Policy Bundle                 │
│  - TTL: 60s                                             │
│  - Size: ~10MB per OPA instance                         │
│  - Hit Rate: >99%                                       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  L2 Cache: Redis (User Permissions)                    │
│  - TTL: 300s                                            │
│  - Size: ~100MB                                         │
│  - Hit Rate: >95%                                       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  L3 Cache: PostgreSQL (Audit Query Results)            │
│  - TTL: None (append-only)                              │
│  - Size: Unlimited (partitioned)                        │
│  - Hit Rate: N/A                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability

### Metrics

```yaml
# Key Prometheus Metrics
- policy_evaluation_duration_seconds (histogram)
  - labels: decision, policy_path
- attestation_verification_duration_seconds (histogram)
  - labels: result, slsa_level
- approval_workflow_duration_seconds (histogram)
  - labels: workflow_type, outcome
- audit_ingestion_rate (counter)
  - labels: event_type, severity
- policy_bundle_refresh_timestamp (gauge)
  - labels: bundle_name
```

### Distributed Tracing

```
Trace: Request → Policy Evaluation → Service Access
├─ Span: api-gateway (duration: 5ms)
│  ├─ Tag: http.method=POST
│  ├─ Tag: http.path=/api/entities/123
│  └─ Tag: user.id=user-456
├─ Span: policy-evaluation (duration: 8ms)
│  ├─ Tag: policy.path=data.intelgraph.authz.allow
│  ├─ Tag: decision=ALLOW
│  └─ Tag: policy.version=v1.2.3
├─ Span: attestation-verification (duration: 45ms)
│  ├─ Tag: attestation.present=true
│  ├─ Tag: attestation.valid=true
│  └─ Tag: slsa.level=3
└─ Span: entity-service (duration: 120ms)
   ├─ Tag: entity.id=123
   └─ Tag: entity.type=Person
```

---

## Disaster Recovery

### Backup Strategy

| Component             | Frequency                      | Retention | RTO  | RPO |
| --------------------- | ------------------------------ | --------- | ---- | --- |
| **Audit Ledger**      | Daily full, hourly incremental | 7 years   | 4h   | 1h  |
| **Provenance Ledger** | Daily full, hourly incremental | 7 years   | 4h   | 1h  |
| **Policy Bundles**    | Continuous (versioned objects) | Forever   | 5min | 0   |
| **Workflow State**    | Daily full                     | 90 days   | 2h   | 24h |

### Disaster Recovery Procedures

```bash
# 1. Restore Audit Ledger
pg_restore --dbname=audit_ledger --clean --if-exists \
  /backups/audit_ledger_2025-12-27.dump

# 2. Restore Provenance Ledger
pg_restore --dbname=provenance_ledger --clean --if-exists \
  /backups/provenance_ledger_2025-12-27.dump

# 3. Restore Policy Bundles (from S3 versioning)
aws s3 sync s3://policy-bundles/main/ /var/opa/bundles/main/ \
  --include "*.tar.gz"

# 4. Restart GA Services
kubectl rollout restart deployment/opa -n governance
kubectl rollout restart deployment/attestation-verifier -n governance
kubectl rollout restart deployment/audit-service -n governance

# 5. Verify Health
kubectl get pods -n governance
curl https://ga.intelgraph.internal/health
```

---

## References

- [Governance Design Document](./GOVERNANCE-DESIGN.md)
- [Trust Boundaries Documentation](./TRUST-BOUNDARIES.md)
- [API Reference](./API-REFERENCE.md)
- [Non-Capabilities](./NON-CAPABILITIES.md)
- [SLSA L3 Compliance](../security/SLSA-L3-COMPLIANCE.md)
- [IC Multi-Tenancy](../../SECURITY/docs/IC-MULTI-TENANCY.md)

---

**Document Control**:

- **Version**: 2.0
- **Last Reviewed**: 2025-12-27
- **Next Review**: 2026-03-27
- **Owner**: Security Architecture Team
- **Approvers**: CTO, CISO
