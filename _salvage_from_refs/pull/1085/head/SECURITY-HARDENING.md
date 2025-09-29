# IntelGraph Platform Security Hardening Guide

This document provides a comprehensive overview of the security hardening implemented for the IntelGraph platform, including container security, runtime protection, network controls, and supply chain security measures.

## Overview

The IntelGraph platform implements defense-in-depth security architecture with multiple layers of protection:

- **Container Image Security**: Secure base images, vulnerability scanning, and image signing
- **Runtime Security**: Pod Security Standards, security contexts, and behavioral monitoring  
- **Network Security**: Zero-trust networking with comprehensive policy enforcement
- **Secrets Management**: External secrets integration with automated rotation
- **RBAC**: Least-privilege access controls with comprehensive auditing
- **Supply Chain Security**: SBOM generation, admission controllers, and policy enforcement

## Quick Start

To deploy all security hardening configurations:

```bash
# Deploy security hardening
./scripts/deploy-security-hardening.sh

# Validate configurations
./scripts/deploy-security-hardening.sh validate

# Generate security report
./scripts/deploy-security-hardening.sh report
```

## Container Image Security

### Hardened Dockerfiles

The platform uses multi-stage builds with distroless base images:

- **File**: `/Dockerfile.secure-enhanced`
- **Base Images**: `gcr.io/distroless/nodejs18-debian12:nonroot`
- **Security Features**:
  - Non-root user (UID 65532)
  - Read-only root filesystem
  - Minimal attack surface (no shell, package managers)
  - Security scanning integration
  - SBOM generation

### Security Scanning Pipeline

Automated security scanning in CI/CD:

- **File**: `/.github/workflows/container-security.yml`
- **Tools**: Trivy, Grype, Docker Scout, Snyk
- **Features**:
  - Vulnerability scanning (CRITICAL/HIGH severity exit on failure)
  - SARIF output for GitHub Security tab integration
  - Daily scheduled scans
  - Multi-architecture builds (amd64/arm64)

### Image Signing and Attestation

Cosign-based image signing:

```bash
# Sign images
cosign sign --yes $IMAGE_URL

# Generate attestations
cosign attest --yes --predicate sbom.json --type spdxjson $IMAGE_URL
```

## Runtime Security

### Pod Security Standards

All namespaces enforce restricted Pod Security Standards:

```yaml
# Applied to all production namespaces
pod-security.kubernetes.io/enforce: restricted
pod-security.kubernetes.io/audit: restricted
pod-security.kubernetes.io/warn: restricted
```

### Security Contexts

Comprehensive security context configuration:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 65532
  runAsGroup: 65532
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: Localhost
    localhostProfile: profiles/intelgraph-seccomp.json
```

### Seccomp Profiles

Custom seccomp profiles restrict system calls:

- **File**: `/k8s/security/pod-security-policy.yaml`
- **Approach**: Allowlist of required syscalls only
- **Coverage**: File I/O, networking, process management

### AppArmor Profiles

Mandatory Access Control policies:

- **File**: `/k8s/security/pod-security-policy.yaml`
- **Features**:
  - File access restrictions
  - Capability dropping
  - Network access controls
  - Sensitive file protection

## Network Security

### Zero-Trust Networking

Default deny-all network policies with explicit allow rules:

- **File**: `/k8s/security/network-security-policies.yaml`
- **Approach**: Deny by default, allow by exception
- **Granularity**: Namespace, pod, and port-level controls

### Service Mesh Security

Istio-based service mesh security:

```yaml
# mTLS enforcement
mtls:
  mode: STRICT

# L7 authorization policies
rules:
- from:
  - source:
      principals: ["cluster.local/ns/ingress-nginx/sa/ingress-nginx"]
  to:
  - operation:
      methods: ["POST"]
      paths: ["/api/maestro/v1/*"]
  when:
  - key: request.headers[authorization]
    values: ["Bearer *"]
```

### Ingress Security

Comprehensive ingress protection:

- Rate limiting (1000 req/min baseline, 2000 burst)
- DDoS protection
- SSL termination with TLS 1.3
- CORS policy enforcement
- Request size limits (50MB)

### Cilium L7 Policies

Application-layer network filtering:

```yaml
# HTTP method and path filtering
rules:
  http:
  - method: "POST"
    path: "/api/maestro/v1/.*"
    headers:
    - "Content-Type: application/json"
```

## Secrets Management

### External Secrets Operator

Integration with HashiCorp Vault:

- **File**: `/k8s/security/secrets-management.yaml`
- **Features**:
  - Vault integration via Kubernetes auth
  - Automatic secret refresh (1h intervals)
  - Template-based secret composition
  - Audit trail for secret access

### Secret Rotation

Automated weekly secret rotation:

```yaml
# CronJob for secret rotation
schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
```

### Secret Scanning

Automated secret detection:

- **Tool**: TruffleHog
- **Schedule**: Every 6 hours
- **Coverage**: Container images, configuration files
- **Action**: Alert on detection, block deployment

### Sealed Secrets

Alternative encrypted secret management:

```yaml
# Encrypted at rest, decrypted in cluster
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
```

## RBAC and Access Control

### Service Account Strategy

Dedicated service accounts per component:

- **maestro-orchestrator-sa**: Application runtime permissions
- **external-secrets-sa**: Secret management permissions
- **secret-rotator-sa**: Secret rotation permissions
- **monitoring-sa**: Metrics collection permissions

### Least Privilege Principles

Minimal required permissions:

```yaml
rules:
# Read-only access to own configuration
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
  resourceNames: ["maestro-config"]
```

### User RBAC

Team-based access controls:

- **Developers**: Read-only access to pods, logs, configurations
- **SRE Team**: Operational access with incident response capabilities
- **Security Team**: Audit access across all resources

## Supply Chain Security

### SBOM Generation

Software Bill of Materials for transparency:

```bash
# Generate SBOM with Syft
syft $IMAGE -o spdx-json --file sbom.spdx.json
```

### Admission Controllers

Policy enforcement at deployment time:

#### OPA Gatekeeper Policies

```yaml
# Security policy constraints
requiredLabels:
  - "app.kubernetes.io/name"
  - "security.intelgraph.ai/level"
allowedRegistries:
  - "ghcr.io/brianlong/intelgraph/"
  - "gcr.io/distroless/"
```

#### Kyverno Policies

Image verification and mutation:

```yaml
# Verify image signatures
verifyImages:
- imageReferences:
  - "ghcr.io/brianlong/intelgraph/*"
  attestors:
  - count: 1
    entries:
    - keys:
        publicKeys: |
          -----BEGIN PUBLIC KEY-----
          MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
          -----END PUBLIC KEY-----
```

### Vulnerability Management

Continuous vulnerability assessment:

- **Pre-deployment**: CI/CD pipeline scanning
- **Runtime**: Periodic image rescanning
- **Response**: Automated patching and redeployment

## Runtime Monitoring

### Falco Rules

Custom threat detection rules:

```yaml
- rule: IntelGraph Unauthorized Process in Container
  desc: Detect unauthorized process execution
  condition: >
    spawned_process and container and 
    k8s.ns.name="intelgraph-production" and
    not proc.name in (node, npm, dumb-init)
  output: >
    Unauthorized process in IntelGraph container 
    (command=%proc.cmdline container=%container.name)
  priority: WARNING
```

### Behavioral Analysis

Runtime behavior monitoring:

- Process execution monitoring
- File system access tracking
- Network connection analysis
- Privilege escalation detection

### Incident Response

Automated threat response:

1. **Detection**: Falco rule triggers
2. **Analysis**: Event correlation and enrichment
3. **Response**: Automated containment actions
4. **Notification**: Slack/PagerDuty integration

## Compliance and Standards

### Standards Compliance

- **NIST 800-53**: Security and Privacy Controls
- **CIS Kubernetes Benchmark**: Level 1 compliance
- **Pod Security Standards**: Restricted profile enforcement
- **OWASP**: Container Security Top 10

### Audit and Logging

Comprehensive audit trail:

- Kubernetes API server audit logs
- Application-level security events
- Network policy violations
- Secret access logging

### Compliance Validation

Automated compliance checking:

```bash
# Run compliance scan
kubectl-bench run --targets node,policies,managedservices
```

## Monitoring and Alerting

### Security Metrics

Key security indicators:

- Policy violation rates
- Admission controller rejection rates
- Runtime threat detection events
- Secret rotation success rates

### Alert Rules

Critical security alerts:

- **PolicyViolationDetected**: Security policy violations
- **UnsignedImageDetected**: Unsigned container deployment attempts
- **UnauthorizedRoleBinding**: Suspicious RBAC changes
- **RuntimeThreatDetected**: Falco threat detection

### Dashboards

Security monitoring dashboards:

- Container security posture
- Network policy effectiveness
- Secret management health
- Compliance status overview

## Maintenance and Operations

### Regular Tasks

#### Daily
- Review security alerts
- Monitor policy violations
- Check secret rotation status

#### Weekly
- Security metric analysis
- Vulnerability scan reviews
- Policy effectiveness assessment

#### Monthly
- Security configuration audit
- Compliance report generation
- Threat model updates

### Incident Response

Security incident procedures:

1. **Detection**: Automated alerting triggers
2. **Assessment**: Severity and impact analysis
3. **Containment**: Immediate threat mitigation
4. **Investigation**: Root cause analysis
5. **Recovery**: Service restoration
6. **Lessons Learned**: Process improvements

### Security Updates

Regular security maintenance:

- Base image updates (monthly)
- Security policy reviews (quarterly)
- Vulnerability remediation (as needed)
- Penetration testing (bi-annually)

## Deployment Files Reference

### Core Security Files

- `/Dockerfile.secure-enhanced` - Hardened multi-stage Dockerfile
- `/.github/workflows/container-security.yml` - Security scanning pipeline
- `/.github/container-structure-test.yaml` - Container validation tests

### Kubernetes Security Configurations

- `/k8s/security/pod-security-policy.yaml` - Pod Security Standards and policies
- `/k8s/security/network-security-policies.yaml` - Network security controls
- `/k8s/security/secrets-management.yaml` - Secrets and rotation management
- `/k8s/security/rbac-security.yaml` - RBAC and access controls
- `/k8s/security/admission-controllers.yaml` - Policy enforcement controllers

### Deployment and Operations

- `/scripts/deploy-security-hardening.sh` - Automated deployment script
- `/charts/maestro/values.yaml` - Enhanced Helm values with security contexts

## Support and Contact

For security-related questions or incidents:

- **Security Team**: security@intelgraph.ai
- **Documentation**: This file and inline code comments
- **Incident Response**: PagerDuty integration active
- **Security Reviews**: Schedule via security team

---

**Last Updated**: $(date)  
**Version**: 1.0  
**Compliance**: NIST 800-53, CIS Level 1, Pod Security Standards (Restricted)