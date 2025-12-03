# Security Documentation

## Overview

This document describes the security controls implemented in the IntelGraph air-gapped container registry infrastructure.

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Layer 1: Network Isolation                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                  Layer 2: Authentication                     │   │
│   │   ┌─────────────────────────────────────────────────────┐   │   │
│   │   │              Layer 3: Authorization                  │   │   │
│   │   │   ┌─────────────────────────────────────────────┐   │   │   │
│   │   │   │        Layer 4: Image Verification           │   │   │   │
│   │   │   │   ┌─────────────────────────────────────┐   │   │   │   │
│   │   │   │   │    Layer 5: Vulnerability Scan      │   │   │   │   │
│   │   │   │   │   ┌─────────────────────────────┐   │   │   │   │   │
│   │   │   │   │   │  Layer 6: Runtime Controls  │   │   │   │   │   │
│   │   │   │   │   └─────────────────────────────┘   │   │   │   │   │
│   │   │   │   └─────────────────────────────────────┘   │   │   │   │
│   │   │   └─────────────────────────────────────────────┘   │   │   │
│   │   └─────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Security Controls

### 1. Network Isolation

**Implementation**: Kubernetes NetworkPolicy

- Harbor components communicate only via internal network
- Egress blocked to external networks in air-gapped mode
- Ingress restricted to approved namespaces

**Files**: `policies/network-policy.yaml`

```yaml
# Key rules:
- Harbor internal: Allow all inter-component traffic
- External: Block all except approved sync endpoints
- DNS: Allow to kube-dns only
```

### 2. Image Signature Verification

**Implementation**: Sigstore Cosign

**Requirements**:
- All images must be signed before deployment
- Signatures verified against trusted keys/identities
- Supports keyless (Fulcio/Rekor) and key-based verification

**Trusted Identities**:
```yaml
trustedIssuers:
  - https://token.actions.githubusercontent.com  # GitHub Actions
  - https://accounts.google.com                  # Google Cloud
```

**Files**: `cosign/cosign-verifier.ts`, `cosign/policy.yaml`

### 3. SLSA Level 3 Provenance

**Implementation**: SLSA Framework Verification

**Requirements**:
- Minimum SLSA Level 3 for production images
- Non-falsifiable provenance attestations
- Trusted builder verification

**Trusted Builders**:
| Builder | SLSA Level | Purpose |
|---------|------------|---------|
| slsa-github-generator | 3 | GitHub Actions builds |
| Google Cloud Build | 3 | GCP builds |
| Tekton Chains | 3 | Kubernetes-native CI |

**Files**: `slsa/slsa3-verifier.ts`, `slsa/trusted-builders.yaml`

### 4. Vulnerability Management

**Implementation**: Trivy Scanner + Policy Engine

**Blocking Policy**:
| Severity | Action | Block Rate Target |
|----------|--------|-------------------|
| CRITICAL | Block | 100% |
| HIGH | Block | 99%+ |
| MEDIUM | Warn | - |
| LOW | Log | - |

**Exception Process**:
1. Security team approval required
2. Time-limited exceptions only
3. Compensating controls documented
4. Tracked in exception registry

**Files**: `policies/vulnerability-policy.yaml`

### 5. Supply Chain Security

**Controls**:
- All images synced through verified pipeline
- Checksums verified on transfer
- Audit trail for all sync operations
- No direct pulls from untrusted registries

**Sync Security**:
```
Online Environment          Transfer Media         Air-Gapped Environment
     │                           │                        │
     ▼                           ▼                        ▼
┌─────────┐                 ┌─────────┐               ┌─────────┐
│ Verify  │────────────────▶│Encrypted│──────────────▶│ Verify  │
│ Sign    │                 │ USB/DVD │               │ Import  │
│ Scan    │                 └─────────┘               │ Scan    │
└─────────┘                      │                    └─────────┘
     │                           │                        │
     ▼                           ▼                        ▼
  Manifest                  Checksums                 Audit Log
```

## Authentication & Authorization

### Authentication Methods

1. **Local Database**: Username/password for service accounts
2. **OIDC**: Integration with identity provider
3. **LDAP/AD**: Enterprise directory integration

### Authorization Model

**RBAC Roles**:
| Role | Permissions |
|------|-------------|
| Admin | Full access |
| Developer | Push/pull to assigned projects |
| Viewer | Pull only |
| Scanner | Trigger scans, view results |
| Sync Operator | Execute image sync |

**Project-Level Permissions**:
- Each project can have independent access controls
- Image signing requirements per project
- Vulnerability thresholds per project

## Secrets Management

### Secret Types

| Secret | Storage | Rotation |
|--------|---------|----------|
| Harbor Admin | K8s Secret | 90 days |
| Database Password | K8s Secret | 90 days |
| TLS Certificates | K8s Secret/cert-manager | Auto |
| Cosign Keys | K8s Secret | As needed |
| API Tokens | K8s Secret | 30 days |

### Key Management

**Cosign Signing Keys**:
- Private keys stored in HSM or Kubernetes secrets
- Never stored in version control
- Separate keys for dev/staging/prod
- Key ceremony for production key generation

**Rotation Procedure**:
1. Generate new key pair
2. Distribute public key to verification endpoints
3. Sign new images with new key
4. Update trusted keys in policy
5. Deprecate old key after transition period

## Audit & Compliance

### Audit Logging

**Events Logged**:
- Image push/pull operations
- Authentication attempts (success/failure)
- Policy violations
- Configuration changes
- Sync operations

**Log Format**:
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "event": "IMAGE_PULL",
  "actor": "service-account/app",
  "resource": "library/nginx:1.25",
  "outcome": "success",
  "source_ip": "10.0.1.50",
  "user_agent": "containerd/1.7.0"
}
```

**Retention**: 90 days minimum, 1 year for security events

### Compliance Mappings

| Control | PCI-DSS | SOC2 | NIST 800-53 |
|---------|---------|------|-------------|
| Image Signing | 6.3.2 | CC6.1 | SI-7 |
| Vulnerability Scan | 6.2 | CC7.1 | RA-5 |
| Access Control | 7.1 | CC6.2 | AC-3 |
| Audit Logging | 10.2 | CC7.2 | AU-2 |
| Network Isolation | 1.3 | CC6.6 | SC-7 |

## Incident Response

### Security Incident Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| P1 - Critical | Compromised image in production | 15 minutes |
| P2 - High | Vulnerability bypass detected | 1 hour |
| P3 - Medium | Policy violation | 4 hours |
| P4 - Low | Audit finding | 24 hours |

### Response Procedures

**Compromised Image**:
1. Quarantine image immediately
2. Identify all deployments using image
3. Roll back to known-good version
4. Preserve evidence for forensics
5. Notify security team
6. Conduct root cause analysis

**Vulnerability Bypass**:
1. Review policy configuration
2. Identify how bypass occurred
3. Update policies to prevent recurrence
4. Rescan affected images
5. Document and review

## Security Testing

### Regular Testing

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| Vulnerability Scan | Continuous | All images |
| Policy Audit | Weekly | All policies |
| Penetration Test | Quarterly | Full infrastructure |
| Disaster Recovery | Semi-annual | Full failover |

### Test Scenarios

1. **Unsigned Image Injection**: Attempt to deploy unsigned image
2. **Signature Forgery**: Attempt to forge valid signature
3. **Policy Bypass**: Attempt to bypass vulnerability policy
4. **Privilege Escalation**: Attempt unauthorized access
5. **Data Exfiltration**: Attempt to extract image data

## Hardening Checklist

### Harbor Hardening

- [ ] TLS enabled for all endpoints
- [ ] Admin password changed from default
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Scan-on-push enabled
- [ ] Content trust enabled
- [ ] Project quotas configured

### Kubernetes Hardening

- [ ] Pod Security Standards enforced
- [ ] Network policies applied
- [ ] RBAC configured
- [ ] Secrets encrypted at rest
- [ ] Service mesh (optional)
- [ ] Runtime security (optional)

### Operating System Hardening

- [ ] Minimal base image (distroless)
- [ ] Non-root user
- [ ] Read-only filesystem
- [ ] No capabilities
- [ ] Seccomp profile applied
- [ ] AppArmor/SELinux enabled

## Contact

**Security Team**: security@intelgraph.local
**Emergency**: PagerDuty - Security On-Call

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-15 | Platform Team | Initial version |
