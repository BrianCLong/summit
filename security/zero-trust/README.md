# Zero-Trust Security Architecture for IntelGraph

> **Version**: 1.0.0
> **Last Updated**: 2025-12-02
> **Compliance**: NIST 800-53, FedRAMP High, CIS Kubernetes Benchmark Level 2

## Overview

This directory contains the comprehensive zero-trust security implementation for IntelGraph, designed specifically for air-gapped deployment environments. The architecture integrates Open Policy Agent (OPA) for policy decisions and Falco for runtime security monitoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Zero-Trust Security Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   Workload  │    │    OPA      │    │   Falco     │    │    SIEM     │   │
│  │  Identity   │───▶│   Policy    │───▶│   Runtime   │───▶│   Audit     │   │
│  │  (SPIFFE)   │    │   Engine    │    │   Monitor   │    │   Logger    │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│         │                  │                  │                  │           │
│         ▼                  ▼                  ▼                  ▼           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Security Event Pipeline                           │    │
│  │  • Authentication • Authorization • Anomaly Detection • Compliance   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Pod Security   │  │ Network Guards   │  │  mTLS Mesh       │          │
│  │     Guards       │  │ (Cilium/Istio)   │  │  (SPIRE)         │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
security/zero-trust/
├── README.md                    # This file
├── opa/
│   ├── policies/
│   │   ├── zero-trust-core.rego     # Core zero-trust policy
│   │   ├── airgap-runtime.rego      # Air-gapped specific policies
│   │   └── workload-identity.rego   # SPIFFE workload identity
│   ├── bundles/                     # OPA policy bundles
│   └── tests/
│       ├── zero-trust-core_test.rego
│       └── airgap-runtime_test.rego
├── falco/
│   ├── rules/
│   │   └── intelgraph-zero-trust.yaml  # Comprehensive Falco rules
│   └── macros/
│       └── intelgraph-macros.yaml      # Reusable Falco macros
├── siem/
│   └── audit-logger.ts              # SIEM integration & audit logging
└── guards/
    ├── pod-security-guards.yaml     # Gatekeeper/Kyverno policies
    └── network-guards.yaml          # Network policies (K8s/Cilium/Istio)
```

## Core Principles

### 1. Never Trust, Always Verify
- Every request requires authentication and authorization
- Identity verification through SPIFFE/SPIRE
- Continuous session validation
- Device trust assessment

### 2. Least Privilege Access
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Just-in-time access provisioning
- Time-bounded permissions

### 3. Assume Breach
- Runtime threat detection via Falco
- Microsegmentation via network policies
- Continuous monitoring and alerting
- Automated incident response

### 4. Defense in Depth
- Multiple security layers
- Pod security standards
- Network isolation
- mTLS everywhere

## Components

### OPA Policies

#### zero-trust-core.rego
Core policy implementing:
- Identity verification with SPIFFE
- Trust score calculation (weighted factors)
- Session freshness validation
- Device compliance checks
- Context analysis (location, time, behavior)
- Step-up authentication triggers

#### airgap-runtime.rego
Air-gapped specific policies:
- Network isolation enforcement
- Internal DNS only
- Local CA certificate validation
- Offline license verification
- Container image allowlisting
- Cross-boundary transfer controls

#### workload-identity.rego
SPIFFE/SPIRE integration:
- SVID validation
- Kubernetes attestation
- Service-to-service authorization
- Workload permissions management

### Falco Rules

Runtime security monitoring for:
- Container escape attempts
- Privilege escalation
- Network anomalies
- File integrity violations
- Cryptomining detection
- Data exfiltration attempts
- Credential theft
- Kubernetes API abuse

### Security Guards

#### Pod Security
- Gatekeeper constraint templates
- Kyverno cluster policies
- Pod Security Standards (PSS) enforcement
- Image digest requirements
- Security context validation

#### Network Guards
- Default deny all
- Service-specific policies
- L7 filtering (Cilium)
- mTLS enforcement (Istio)
- DNS restrictions for air-gapped

### SIEM Integration

Audit logging with:
- CEF, LEEF, Syslog, Splunk HEC formats
- Tamper-evident checksums (HMAC)
- Compliance metadata tagging
- Correlation ID tracking
- Batch processing with retry

## Deployment

### Prerequisites

1. **Kubernetes Cluster** (v1.28+)
2. **OPA/Gatekeeper** (v3.14+)
3. **Falco** (v0.36+)
4. **SPIRE** (v1.8+)
5. **Cilium** or **Istio** for service mesh

### Installation

```bash
# Install OPA/Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.14.0/deploy/gatekeeper.yaml

# Apply zero-trust policies
kubectl apply -f security/zero-trust/guards/pod-security-guards.yaml
kubectl apply -f security/zero-trust/guards/network-guards.yaml

# Deploy Falco with custom rules
helm upgrade --install falco falcosecurity/falco \
  --namespace security \
  --set falco.rulesFile[0]=/etc/falco/rules.d/intelgraph-zero-trust.yaml \
  --set-file falco.rules_yaml=security/zero-trust/falco/rules/intelgraph-zero-trust.yaml

# Load OPA policies
kubectl create configmap opa-policies \
  --from-file=security/zero-trust/opa/policies/ \
  -n security
```

### Configuration

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPA_URL` | OPA service endpoint | `http://opa:8181` |
| `SPIRE_SOCKET` | SPIRE agent socket path | `/run/spire/sockets/agent.sock` |
| `SIEM_ENDPOINT` | SIEM collector endpoint | `siem.intelgraph.local` |
| `AUDIT_HMAC_KEY` | HMAC key for audit logs | (required) |

#### OPA Data Configuration

Create `data.json` for OPA:

```json
{
  "revoked_identities": [],
  "blocked_ips": [],
  "allowed_locations": ["datacenter-1", "datacenter-2"],
  "business_hours": {"start": 6, "end": 22},
  "trusted_domains": ["intelgraph.local", "intelgraph.airgap"],
  "airgap": {
    "trusted_cas": ["intelgraph-ca"],
    "approved_destinations": ["*.svc.cluster.local"],
    "approved_ports": [5432, 6379, 7474, 7687, 8080, 8181],
    "trusted_namespaces": ["intelgraph-production", "intelgraph-staging"],
    "required_license_features": ["core"]
  }
}
```

## Tradeoffs Analysis

### Security vs. Performance

| Aspect | Trade-off | Mitigation |
|--------|-----------|------------|
| **OPA Policy Evaluation** | +5-15ms latency per request | Use OPA caching, local sidecars |
| **mTLS Overhead** | +2-5ms per connection | Hardware acceleration, connection pooling |
| **Falco Syscall Monitoring** | 1-3% CPU overhead | Tune rule specificity, eBPF probes |
| **Audit Logging** | Network/storage overhead | Batch writes, compression |

### Defense Depth vs. Operational Complexity

| Component | Benefit | Complexity Cost |
|-----------|---------|-----------------|
| **SPIFFE/SPIRE** | Cryptographic workload identity | Additional infrastructure, certificate management |
| **Gatekeeper** | Admission control | Policy maintenance, potential deployment blocks |
| **Network Policies** | Microsegmentation | Complex troubleshooting, policy sprawl |
| **Falco Runtime** | Real-time threat detection | Alert fatigue, tuning required |

### Air-Gapped Constraints

| Challenge | Solution | Impact |
|-----------|----------|--------|
| No external DNS | Internal DNS only | Limited external integrations |
| No public registries | Local registry mirror | Image pipeline required |
| No external CAs | Internal PKI | Certificate management burden |
| No cloud services | Local alternatives | Self-managed infrastructure |

## Security Considerations

### Threat Model

1. **External Attackers**: Blocked by air-gap + network policies
2. **Compromised Containers**: Detected by Falco, contained by microsegmentation
3. **Insider Threats**: Audit logging, least privilege, MFA enforcement
4. **Supply Chain**: Image signing, digest verification, SBOM tracking
5. **Lateral Movement**: Zero-trust verification at every hop

### Compliance Mapping

| Framework | Controls Addressed |
|-----------|-------------------|
| **NIST 800-53** | AC-2, AC-3, AC-6, AU-2, AU-3, IA-2, IA-5, SC-7, SC-8, SI-4 |
| **FedRAMP High** | All applicable security controls |
| **CIS Kubernetes** | Levels 1 and 2 compliance |
| **SOC 2 Type II** | Security, Availability, Confidentiality |

## Testing

### Run OPA Policy Tests

```bash
# Run all policy tests
opa test security/zero-trust/opa/policies/ security/zero-trust/opa/tests/ -v

# Run specific test file
opa test security/zero-trust/opa/policies/zero-trust-core.rego \
         security/zero-trust/opa/tests/zero-trust-core_test.rego -v
```

### Validate Falco Rules

```bash
# Syntax check
falco --validate security/zero-trust/falco/rules/intelgraph-zero-trust.yaml

# Dry run
falco -r security/zero-trust/falco/rules/intelgraph-zero-trust.yaml --dry-run
```

### Test Network Policies

```bash
# Test connectivity (should succeed)
kubectl exec -it test-pod -n intelgraph-production -- \
  curl -s http://postgresql.database.svc.cluster.local:5432

# Test external (should fail in air-gapped)
kubectl exec -it test-pod -n intelgraph-production -- \
  curl -s http://external.com --connect-timeout 5
```

## Monitoring & Alerting

### Key Metrics

- `opa_decision_latency_seconds` - Policy evaluation time
- `falco_events_total` - Runtime security events
- `spire_svid_ttl_seconds` - Workload identity expiration
- `zerotrust_trust_score` - Trust score distribution

### Alert Thresholds

| Alert | Threshold | Severity |
|-------|-----------|----------|
| High OPA Deny Rate | >10% denials | Warning |
| Critical Falco Alert | Any critical rule | Critical |
| SVID Expiration | <1 hour TTL | Warning |
| Trust Score Drop | <0.5 score | High |

## Maintenance

### Policy Updates

1. Update policy in `opa/policies/`
2. Run tests: `opa test ...`
3. Deploy to staging
4. Validate with synthetic traffic
5. Promote to production

### Falco Rule Tuning

1. Monitor false positive rate
2. Adjust conditions/exceptions
3. Test in permissive mode
4. Enable enforcement

### Certificate Rotation

- SPIRE handles automatic SVID rotation
- CA certificates: manual rotation every 2 years
- mTLS certificates: automatic via cert-manager

## Troubleshooting

### Common Issues

**OPA Denying Valid Requests**
```bash
# Check decision logs
curl http://opa:8181/v1/data/intelgraph/zerotrust/core -d '{"input": {...}}'

# View detailed reason
jq '.result.decision_reason' response.json
```

**Falco False Positives**
```bash
# Check which rule triggered
falco --list | grep -i "<rule_name>"

# Add exception
# Edit macros file with exclusion
```

**Network Policy Blocking Traffic**
```bash
# Check if policy exists
kubectl get networkpolicy -n <namespace>

# Test with ephemeral debug pod
kubectl run debug --rm -it --image=nicolaka/netshoot -- /bin/bash
```

## References

- [OPA Documentation](https://www.openpolicyagent.org/docs/latest/)
- [Falco Rules Reference](https://falco.org/docs/rules/)
- [SPIFFE/SPIRE](https://spiffe.io/docs/latest/)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [NIST 800-53](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)

## Support

For issues or questions:
- Security Team: security@intelgraph.ai
- Slack: #intelgraph-security
- Runbook: RUNBOOKS/zero-trust-incident-response.md
