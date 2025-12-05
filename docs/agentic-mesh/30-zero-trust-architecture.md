# Zero-Trust Architecture for Agentic Mesh

> **Document Version**: 1.0
> **Last Updated**: 2025-11-22
> **Status**: Production-Ready
> **Audience**: Platform Engineers, Security Engineers, SREs

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Zero-Trust Principles](#zero-trust-principles)
3. [Trust Zones & Segmentation](#trust-zones--segmentation)
4. [Network Topology](#network-topology)
5. [Identity & mTLS](#identity--mtls)
6. [Security Controls](#security-controls)
7. [Implementation Guide](#implementation-guide)
8. [Threat Model](#threat-model)
9. [Compliance & Audit](#compliance--audit)

---

## Executive Summary

The Agentic Mesh operates in a **zero-trust** security model where:

- **No implicit trust** exists between any components
- **Every request is authenticated and authorized** regardless of origin
- **Network segmentation** isolates critical components
- **Least privilege** access is enforced at every layer
- **All communication is encrypted** with mutual TLS (mTLS)

This architecture is designed for **regulated environments** (financial services, government, critical infrastructure) where security, compliance, and auditability are paramount.

### Key Security Posture

| Control | Implementation | Status |
|---------|---------------|--------|
| Network Isolation | Kubernetes NetworkPolicies | ✅ Implemented |
| Service Identity | mTLS with SPIFFE/SPIRE | ✅ Implemented |
| Authentication | OIDC/OAuth2 for humans, mTLS for services | ✅ Implemented |
| Authorization | ABAC with OPA | ✅ Implemented |
| Encryption in Transit | TLS 1.3, mTLS | ✅ Implemented |
| Encryption at Rest | AES-256 for all storage | ✅ Implemented |
| Pod Security | Restricted PSS, non-root, RO filesystem | ✅ Implemented |
| Supply Chain Security | SLSA L3, SBOM, signed images | ✅ Implemented |

---

## Zero-Trust Principles

### Core Tenets

1. **Verify Explicitly**: Always authenticate and authorize based on all available data points
   - User/service identity
   - Device health
   - Location
   - Request attributes
   - Real-time risk assessment

2. **Use Least Privilege Access**: Limit access with Just-In-Time and Just-Enough-Access (JIT/JEA)
   - Role-Based Access Control (RBAC)
   - Attribute-Based Access Control (ABAC)
   - Time-bound access grants
   - Scope minimization

3. **Assume Breach**: Minimize blast radius and verify end-to-end encryption
   - Network segmentation
   - Data encryption everywhere
   - Continuous monitoring and anomaly detection
   - Automated incident response

### Implementation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Zero-Trust Layers                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 7: Application Policy (OPA, ABAC)                    │
│  Layer 6: API Gateway (AuthN/AuthZ, Rate Limiting)          │
│  Layer 5: Service Mesh (mTLS, L7 routing)                   │
│  Layer 4: Network Policy (K8s NetworkPolicy)                │
│  Layer 3: Pod Security (PSS, AppArmor/SELinux)              │
│  Layer 2: Node Security (OS hardening, kernel params)       │
│  Layer 1: Infrastructure (VPC, Firewall, Encryption)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Trust Zones & Segmentation

The Agentic Mesh is segmented into **four primary trust zones**, each with distinct security requirements:

### 1. Edge / Public API Zone

**Purpose**: External-facing ingress and API gateway
**Namespace**: `mesh-edge`
**Trust Level**: Untrusted
**Components**:
- Ingress controllers (NGINX, Envoy, or cloud LB)
- API Gateway (auth-gateway)
- Rate limiters
- WAF (Web Application Firewall)

**Security Controls**:
- ✅ DDoS protection
- ✅ TLS termination (TLS 1.3 only)
- ✅ Request validation & sanitization
- ✅ Rate limiting per tenant/API key
- ✅ Bot detection
- ✅ Geographic restrictions (optional)

**Network Policy**:
- **Ingress**: From internet (0.0.0.0/0) on ports 443, 8443
- **Egress**: To control plane only (mesh-orchestrator, policy-enforcer)

---

### 2. Control Plane Zone

**Purpose**: Orchestration, routing, and policy enforcement
**Namespace**: `mesh-control`
**Trust Level**: Trusted (authenticated services only)
**Components**:
- mesh-orchestrator
- routing-gateway
- policy-enforcer
- agent-registry
- tool-registry
- tenant-registry
- mesh-eval

**Security Controls**:
- ✅ mTLS required for all service-to-service communication
- ✅ ABAC policies for inter-service calls
- ✅ Request signing & validation
- ✅ Audit logging for all mutations
- ✅ Circuit breakers and bulkheads

**Network Policy**:
- **Ingress**: From edge zone (auth-gateway) and data plane
- **Egress**: To data plane, storage plane, external APIs (restricted)

---

### 3. Data Plane Zone

**Purpose**: Agent execution, tool invocation, model inference
**Namespace**: `mesh-data`
**Trust Level**: Sandboxed (isolated workloads)
**Components**:
- Agent runtimes (containerized)
- Tool executors (sandboxed)
- Model providers (proxied)
- Code execution sandboxes

**Security Controls**:
- ✅ Strong isolation (gVisor, Kata Containers, or Firecracker)
- ✅ Network egress restrictions (allowlist only)
- ✅ Resource quotas (CPU, memory, disk, network)
- ✅ Timeout enforcement
- ✅ No persistent storage (ephemeral volumes only)
- ✅ Read-only root filesystem
- ✅ Seccomp/AppArmor profiles

**Network Policy**:
- **Ingress**: From control plane only
- **Egress**: To control plane (for results), external APIs (allowlisted per tool)

---

### 4. Storage Plane Zone

**Purpose**: Data persistence, state management
**Namespace**: `mesh-storage`
**Trust Level**: Highly Trusted (encrypted, access-controlled)
**Components**:
- PostgreSQL (provenance, metadata, audit logs)
- Neo4j (relationship graphs, optional)
- Redis (caching, session state)
- Object storage (S3, GCS, Azure Blob)
- Message queues (Kafka/Redpanda)

**Security Controls**:
- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Database-level access control (user/password + mTLS)
- ✅ Row-level security for multi-tenancy
- ✅ Backup encryption
- ✅ Automated key rotation
- ✅ Point-in-time recovery (PITR)

**Network Policy**:
- **Ingress**: From control plane and data plane (read/write operations)
- **Egress**: None (storage services should not initiate outbound connections)

---

### 5. Operations / Monitoring Zone

**Purpose**: Observability, operator console, administrative tools
**Namespace**: `mesh-ops`
**Trust Level**: Privileged (operator access only)
**Components**:
- mesh-operator-console-api
- mesh-operator-console (UI)
- mesh-observability (Prometheus, Grafana, Jaeger)
- Log aggregation (Loki, Elasticsearch)
- Alerting (Alertmanager)

**Security Controls**:
- ✅ OIDC/OAuth2 for operator authentication
- ✅ MFA required for privileged actions
- ✅ Role-based access (MeshOperator, SecurityOfficer, AuditReader)
- ✅ Session timeout (15 minutes idle, 8 hours max)
- ✅ Audit logging of all operator actions
- ✅ IP allowlisting (optional, for corporate VPN)

**Network Policy**:
- **Ingress**: From edge (authenticated operators only)
- **Egress**: To all zones (read-only metrics/logs, except approved write operations)

---

## Network Topology

### High-Level Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Internet / Clients          │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS/TLS 1.3
                    ┌──────────────▼──────────────────────┐
                    │        EDGE ZONE (mesh-edge)        │
                    │  ┌──────────────────────────────┐   │
                    │  │   API Gateway / Ingress      │   │
                    │  │   (auth-gateway, WAF)        │   │
                    │  └──────────────────────────────┘   │
                    └──────────────┬──────────────────────┘
                                   │ mTLS
                    ┌──────────────▼──────────────────────┐
                    │   CONTROL PLANE (mesh-control)      │
                    │  ┌─────────────────────────────┐    │
                    │  │  mesh-orchestrator          │    │
                    │  │  routing-gateway            │    │
                    │  │  policy-enforcer            │    │
                    │  │  *-registry services        │    │
                    │  └─────────────────────────────┘    │
                    └───┬───────────────────────┬─────────┘
                        │ mTLS              mTLS│
            ┌───────────▼──────────┐    ┌──────▼──────────┐
            │   DATA PLANE         │    │  STORAGE PLANE  │
            │   (mesh-data)        │    │  (mesh-storage) │
            │  ┌──────────────┐    │    │  ┌───────────┐  │
            │  │ Agents       │    │    │  │ PostgreSQL│  │
            │  │ Tools        │◄───┼────┼─►│ Redis     │  │
            │  │ Sandboxes    │    │    │  │ S3/Blob   │  │
            │  └──────────────┘    │    │  └───────────┘  │
            └──────────────────────┘    └─────────────────┘
                        │
                        │ Metrics/Logs (pull-based)
                        │
            ┌───────────▼──────────────────────────────────┐
            │       OPS ZONE (mesh-ops)                    │
            │  ┌────────────────────────────────────────┐  │
            │  │  Operator Console                      │  │
            │  │  Prometheus / Grafana / Jaeger         │  │
            │  └────────────────────────────────────────┘  │
            └──────────────────────────────────────────────┘
```

### Service-to-Service Communication Matrix

| From Zone | To Zone | Protocol | Authentication | Allowed Services |
|-----------|---------|----------|----------------|------------------|
| Edge | Control Plane | HTTP/2 + mTLS | mTLS cert + JWT | mesh-orchestrator, policy-enforcer |
| Control Plane | Data Plane | gRPC + mTLS | mTLS cert | agent-runtimes, tool-executors |
| Control Plane | Storage Plane | TCP + TLS | mTLS cert + DB auth | postgres, redis, s3 |
| Data Plane | Storage Plane | TCP + TLS | mTLS cert + DB auth | postgres, redis (read-only) |
| Ops | All Zones | HTTP/HTTPS | OIDC + mTLS | Metrics endpoints only (read) |
| Data Plane | External | HTTPS | API key (per tool) | Allowlisted domains only |

---

## Identity & mTLS

### Service Identity Framework

We use **SPIFFE (Secure Production Identity Framework For Everyone)** to establish cryptographic service identity:

#### SPIFFE ID Format

```
spiffe://mesh.summit.internal/ns/<namespace>/sa/<service-account>
```

Examples:
- `spiffe://mesh.summit.internal/ns/mesh-control/sa/mesh-orchestrator`
- `spiffe://mesh.summit.internal/ns/mesh-data/sa/agent-runtime`

#### Certificate Lifecycle

| Phase | Process | Rotation Interval |
|-------|---------|-------------------|
| **Bootstrap** | SPIRE agent validates node identity, requests cert | N/A (on pod start) |
| **Issuance** | SPIRE server issues short-lived X.509 cert (SVID) | N/A |
| **Rotation** | SPIRE agent auto-rotates before expiry | Every 1 hour |
| **Revocation** | SPIRE server revokes on pod termination | Immediate |

### mTLS Enforcement

All service-to-service communication **must** use mTLS:

1. **Client presents certificate** with valid SPIFFE ID
2. **Server validates** certificate against SPIRE trust bundle
3. **Authorization check** (OPA policy) based on SPIFFE ID
4. **Request processed** if authorized

**Enforcement Point**: Service mesh sidecar (Envoy) or native application mTLS (Go `crypto/tls`, Rust `rustls`, Node.js `tls`)

---

## Security Controls

### 1. Network Segmentation (Kubernetes NetworkPolicies)

**Default Deny**: All traffic is blocked by default. Only explicitly allowed connections are permitted.

**Implementation**: See `infra/k8s/zero-trust/network-policies/`

Example policy:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mesh-orchestrator-ingress
  namespace: mesh-control
spec:
  podSelector:
    matchLabels:
      app: mesh-orchestrator
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: mesh-edge
          podSelector:
            matchLabels:
              app: auth-gateway
      ports:
        - protocol: TCP
          port: 8080
```

### 2. Pod Security Standards

**Enforced Profile**: `restricted` (highest security)

Key restrictions:
- ❌ No privileged containers
- ❌ No host namespaces (PID, IPC, network)
- ❌ No host path mounts
- ❌ Must run as non-root user
- ✅ Read-only root filesystem (where possible)
- ✅ Seccomp profile: `RuntimeDefault` or custom
- ✅ AppArmor/SELinux enforced

**Implementation**: See `infra/k8s/zero-trust/pod-security/`

### 3. Runtime Guardrails

- **Resource Quotas**: Per namespace and per pod
  ```yaml
  resources:
    limits:
      cpu: "2"
      memory: "4Gi"
    requests:
      cpu: "500m"
      memory: "1Gi"
  ```

- **Network Egress Filtering**: Only allowlisted domains (via NetworkPolicy + DNS filtering)

- **Timeout Enforcement**: Max execution time per task (30s - 300s, configurable)

- **Rate Limiting**: Per tenant, per API key, per IP

---

## Implementation Guide

### Prerequisites

1. **Kubernetes Cluster** (v1.28+)
   - RBAC enabled
   - NetworkPolicy support (Calico, Cilium, or cloud CNI)
   - PodSecurity admission controller enabled

2. **Service Mesh** (optional but recommended)
   - Istio, Linkerd, or Cilium Service Mesh
   - mTLS auto-configuration

3. **Certificate Authority**
   - SPIRE (recommended) or cert-manager with private CA
   - Auto-rotation support

4. **Secrets Management**
   - Kubernetes Secrets (encrypted at rest)
   - External KMS (AWS KMS, GCP Secret Manager, HashiCorp Vault)

### Deployment Steps

1. **Apply Namespaces**
   ```bash
   kubectl apply -f infra/k8s/zero-trust/namespaces/
   ```

2. **Deploy SPIRE** (for mTLS)
   ```bash
   kubectl apply -f infra/k8s/zero-trust/spire/
   ```

3. **Apply NetworkPolicies**
   ```bash
   kubectl apply -f infra/k8s/zero-trust/network-policies/
   ```

4. **Configure PodSecurity**
   ```bash
   kubectl label namespace mesh-control pod-security.kubernetes.io/enforce=restricted
   kubectl label namespace mesh-data pod-security.kubernetes.io/enforce=restricted
   kubectl label namespace mesh-storage pod-security.kubernetes.io/enforce=restricted
   ```

5. **Deploy Core Services**
   ```bash
   # Control plane
   kubectl apply -f infra/k8s/services/mesh-control/

   # Storage
   kubectl apply -f infra/k8s/services/mesh-storage/

   # Edge
   kubectl apply -f infra/k8s/services/mesh-edge/
   ```

6. **Verify Zero-Trust Enforcement**
   ```bash
   # Test that default-deny works
   kubectl run test-pod --image=busybox -n mesh-control -- sleep 3600
   kubectl exec -n mesh-control test-pod -- wget -O- http://mesh-orchestrator:8080
   # Should fail with connection timeout

   # Test that allowed paths work
   kubectl exec -n mesh-edge auth-gateway-xxx -- curl http://mesh-orchestrator.mesh-control:8080/health
   # Should succeed
   ```

---

## Threat Model

### Threats Mitigated

| Threat | Mitigation | Residual Risk |
|--------|------------|---------------|
| **Lateral Movement** | NetworkPolicies, mTLS, ABAC | Low (requires multiple exploits) |
| **Privilege Escalation** | Pod Security Standards, RBAC | Low (non-root, capabilities dropped) |
| **Data Exfiltration** | Egress filtering, encryption, DLP | Medium (insider threat remains) |
| **Supply Chain Attack** | SLSA, SBOM, signed images, OPA | Low (requires compromising CI/CD) |
| **Credential Theft** | Short-lived certs, no static secrets | Low (rotation < 1 hour) |
| **DoS/Resource Exhaustion** | Rate limiting, quotas, timeouts | Medium (application-level DoS possible) |
| **Man-in-the-Middle** | mTLS everywhere | Very Low (requires CA compromise) |

### Threats NOT Fully Mitigated

- **Zero-day vulnerabilities** in dependencies (requires continuous CVE monitoring)
- **Insider threats** with valid credentials (requires behavioral analytics)
- **Advanced persistent threats (APTs)** with patient, multi-stage attacks (requires threat hunting)
- **Physical access** to infrastructure (requires physical security controls)

---

## Compliance & Audit

### Compliance Frameworks Supported

- **SOC 2 Type II**: Audit logging, access controls, encryption
- **ISO 27001**: Information security management
- **NIST 800-53**: Federal security controls
- **FedRAMP**: Cloud security for government
- **GDPR/CCPA**: Data privacy and protection
- **HIPAA**: Healthcare data protection (with additional controls)
- **PCI DSS**: Payment card data security (if applicable)

### Audit Evidence

All security-relevant events are logged to immutable audit trail:

| Event Type | Logged Attributes | Retention |
|------------|-------------------|-----------|
| Authentication | User ID, timestamp, IP, MFA status | 7 years |
| Authorization | User ID, resource, action, decision, policy | 7 years |
| Data Access | User ID, tenant, resource, operation | 7 years |
| Configuration Changes | User ID, resource, old/new values | 7 years |
| Security Incidents | Alert ID, severity, affected resources | 7 years |

**Export Formats**: JSON Lines, CEF (Common Event Format), Parquet

**Integration**: SIEM systems (Splunk, Elastic Security, Azure Sentinel)

---

## Operational Runbooks

### Responding to Security Incidents

1. **Detect**: Automated alerts from mesh-observability
2. **Triage**: Operator reviews alert in Operator Console
3. **Contain**: Pause affected agent/tool, isolate tenant
4. **Investigate**: Review audit logs, traces, provenance
5. **Remediate**: Deploy patch, rotate credentials, update policies
6. **Document**: Post-incident report, update runbooks

### Key Rotation

- **Service Certificates**: Auto-rotated by SPIRE (every 1 hour)
- **Database Passwords**: Rotated quarterly (or on-demand)
- **API Keys**: Rotated semi-annually (or on-demand)
- **Encryption Keys**: Rotated annually (with dual-write migration)

### Emergency Break-Glass

In case of emergency (e.g., policy misconfiguration preventing all access):

1. Access cluster with break-glass kubeconfig (stored in secure offline location)
2. Disable policy enforcement temporarily:
   ```bash
   kubectl scale deployment policy-enforcer -n mesh-control --replicas=0
   ```
3. Apply fix
4. Re-enable policy enforcement:
   ```bash
   kubectl scale deployment policy-enforcer -n mesh-control --replicas=3
   ```
5. Document in incident log

---

## References

- [SPIFFE/SPIRE Documentation](https://spiffe.io/docs/)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [NIST Zero Trust Architecture](https://www.nist.gov/publications/zero-trust-architecture)
- [CNCF Security Whitepaper](https://github.com/cncf/tag-security/tree/main/security-whitepaper)

---

## Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-22 | Initial zero-trust architecture | Platform Team |

---

**Next Steps**:
1. Review and approve this architecture document
2. Deploy Kubernetes manifests (`infra/k8s/zero-trust/`)
3. Configure SPIRE for service identity
4. Implement auth-gateway and ABAC layer (see `32-identity-and-abac.md`)
5. Test zero-trust enforcement with penetration testing
