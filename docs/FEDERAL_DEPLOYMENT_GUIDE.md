# IntelGraph Federal/Government Deployment Guide

## Overview

This guide covers deployment of IntelGraph Maestro Conductor v1.0 GA with Federal/Government Pack features, including FIPS 140-2 validation, air-gap support, and break-glass procedures for classified environments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEDERAL DEPLOYMENT ARCHITECTURE              │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   FIPS HSM      │   Air-Gap       │   Zero-Trust    │  WORM     │
│   Crypto        │   Registry      │   mTLS          │  Audit    │
│                 │                 │                 │           │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌───────┐ │
│ │AWS CloudHSM │ │ │Offline      │ │ │SPIRE Agent  │ │ │S3     │ │
│ │FIPS Level 3 │ │ │Package      │ │ │Certificate  │ │ │Object │ │
│ │Validation   │ │ │Verification │ │ │Authority    │ │ │Lock   │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └───────┘ │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
           │                │                │                │
           ▼                ▼                ▼                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │              CONDUCTOR FEDERAL POD                          │
    │  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
    │  │ Conductor   │ SPIFFE      │ FIPS        │ Air-Gap     │  │
    │  │ Main        │ Helper      │ Validator   │ Monitor     │  │
    │  │ Container   │ Sidecar     │ Sidecar     │ Sidecar     │  │
    │  └─────────────┴─────────────┴─────────────┴─────────────┘  │
    └─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Infrastructure Requirements

#### Hardware Security Modules (HSM)

- **AWS CloudHSM**: Minimum 2 HSMs in different AZs
- **Azure Dedicated HSM**: FIPS 140-2 Level 3 validated
- **On-Premises HSM**: Thales Luna, Utimaco, or SafeNet

#### Node Requirements

```yaml
# Kubernetes node labels required
labels:
  classification: "UNCLASSIFIED" # or SECRET, TOP_SECRET
  fips-validated: "true"
  air-gap: "true" # if air-gapped deployment

# Node taints for workload isolation
taints:
  - key: "classification"
    value: "UNCLASSIFIED"
    effect: "NoSchedule"
```

#### Storage Requirements

- **FIPS Crypto Storage**: 1Gi SSD (encrypted)
- **Offline Registry**: 50Gi+ (air-gap deployments)
- **Audit Logs**: 100Gi+ (WORM compliant)
- **Break-Glass**: 5Gi (secure procedures)

### Software Prerequisites

#### FIPS-Validated Components

```bash
# Verify FIPS mode in Node.js
$ node -p "crypto.getFips()"
1

# Verify OpenSSL FIPS module
$ openssl version -a | grep FIPS
FIPS mode capable

# Validate container images
$ cosign verify --key fips-signing-key.pub \
  intelgraph/conductor-federal:v1.0.0-fips
```

## Deployment Process

### 1. Environment Preparation

#### Enable FIPS Mode

```bash
# Enable FIPS in kernel (requires reboot)
$ sudo fips-mode-setup --enable
$ sudo reboot

# Verify FIPS kernel module
$ cat /proc/sys/crypto/fips_enabled
1

# Configure Node.js FIPS
$ export NODE_OPTIONS="--enable-fips"
```

#### HSM Setup (AWS CloudHSM Example)

```bash
# Create HSM cluster
$ aws cloudhsmv2 create-cluster \
  --hsm-type hsm1.medium \
  --source-backup-id <backup-id> \
  --subnet-ids subnet-12345678 subnet-87654321

# Initialize HSM
$ aws cloudhsmv2 create-hsm \
  --cluster-id <cluster-id> \
  --availability-zone us-gov-east-1a

# Configure HSM client
$ sudo /opt/cloudhsm/bin/configure -a <cluster-ip>
```

#### Air-Gap Network Isolation

```bash
# Verify no outbound internet access
$ curl -I --connect-timeout 5 https://google.com
curl: (28) Connection timed out

# Configure internal DNS only
$ cat /etc/systemd/resolved.conf
[Resolve]
DNS=10.0.0.53
FallbackDNS=
Domains=agency.local
```

### 2. Kubernetes Cluster Setup

#### Install FIPS-Validated Kubernetes

```bash
# Use government-approved Kubernetes distribution
# Examples: Red Hat OpenShift Government, SUSE Rancher Government

# Verify FIPS compliance
$ kubectl get nodes -o wide
$ kubectl describe node <node-name> | grep fips-validated
```

#### Configure Node Classification

```bash
# Label nodes by classification level
$ kubectl label node worker-1 classification=UNCLASSIFIED
$ kubectl label node worker-1 fips-validated=true
$ kubectl label node worker-1 air-gap=true

# Apply security taints
$ kubectl taint node worker-1 classification=UNCLASSIFIED:NoSchedule
```

### 3. Deploy Core Services

#### SPIRE Identity Infrastructure

```bash
# Deploy SPIRE server
$ helm install spire-server ./helm/intelgraph \
  --set spire.enabled=true \
  --set spire.server.image="ghcr.io/spiffe/spire-server:1.8.5-fips" \
  --set spire.trustDomain="federal.intelgraph.local" \
  --namespace intelgraph-federal \
  --create-namespace

# Deploy SPIRE agents
$ helm install spire-agents ./helm/intelgraph \
  --set spire.agent.enabled=true \
  --set spire.agent.image="ghcr.io/spiffe/spire-agent:1.8.5-fips"
```

#### Federal Secrets Management

```bash
# Create HSM credentials
$ kubectl create secret generic hsm-credentials \
  --from-literal=cluster_id="<cluster-id>" \
  --from-literal=username="<hsm-user>" \
  --from-literal=password="<hsm-password>" \
  --namespace intelgraph-federal

# Create AWS credentials for WORM storage
$ kubectl create secret generic aws-credentials-federal \
  --from-file=credentials=/root/.aws/credentials \
  --from-file=config=/root/.aws/config \
  --namespace intelgraph-federal
```

### 4. Deploy Federal IntelGraph

#### Helm Configuration

```yaml
# values-federal.yaml
federal:
  enabled: true
  classification: "UNCLASSIFIED"

  fips:
    enabled: true
    level: 3
    hsm:
      provider: "AWS_CloudHSM"
      endpoint: "10.0.0.100"
      partition: "PARTITION_1"

  airGap:
    enabled: true
    mode: "STRICT"
    offlineRegistry: "/opt/intelgraph/registry"

  breakGlass:
    enabled: true
    maxDuration: 4 # hours
    requiredApprovers: 2

spire:
  enabled: true
  trustDomain: "federal.intelgraph.local"

audit:
  wormEnabled: true
  bucket: "federal-audit-worm-bucket"
  retentionDays: 7300 # 20 years

zeroTrust:
  enabled: true
  requireSpiffeId: true

mtls:
  enabled: true
```

#### Deploy Federal Pack

```bash
# Install with federal values
$ helm install intelgraph-federal ./helm/intelgraph \
  -f values-federal.yaml \
  --namespace intelgraph-federal \
  --create-namespace

# Verify deployment
$ kubectl get pods -n intelgraph-federal
NAME                            READY   STATUS    RESTARTS   AGE
conductor-federal-0             4/4     Running   0          2m
spire-server-0                  1/1     Running   0          5m
spire-agent-abc12               1/1     Running   0          5m
```

### 5. Air-Gap Registry Setup

#### Initialize Offline Registry

```bash
# Create offline registry structure
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- mkdir -p /opt/intelgraph/registry/{components,sboms,signatures}

# Load base components
$ kubectl cp base-components.tar.gz conductor-federal-0:/tmp/
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  tar -xzf /tmp/base-components.tar.gz -C /opt/intelgraph/registry/
```

#### Validate Component Signatures

```bash
# Verify all components
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  /opt/intelgraph/tools/verify-components.sh

# Example output:
# ✓ conductor@1.0.0: SBOM valid, signature verified
# ✓ marketplace@1.0.0: SBOM valid, signature verified
# ✓ safety-v2@2.0.0: SBOM valid, signature verified
```

## Configuration

### Environment Variables

#### FIPS Configuration

```bash
# Conductor container environment
FIPS_ENABLED=true
FIPS_MODE=FIPS_140_2_LEVEL_3
HSM_PROVIDER=AWS_CloudHSM
HSM_CLUSTER_ID=cluster-abc123
```

#### Air-Gap Configuration

```bash
AIRGAP_ENABLED=true
AIRGAP_MODE=STRICT
OFFLINE_REGISTRY_PATH=/opt/intelgraph/registry
```

#### Break-Glass Configuration

```bash
BREAKGLASS_ENABLED=true
BREAKGLASS_MAX_DURATION=4
BREAKGLASS_REQUIRED_APPROVERS=2
```

### Network Policies

#### Strict Network Isolation

```yaml
# air-gap-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: air-gap-isolation
  namespace: intelgraph-federal
spec:
  podSelector:
    matchLabels:
      air-gap: "true"
  policyTypes:
    - Ingress
    - Egress

  # Only allow intra-cluster communication
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              classification: "UNCLASSIFIED"

  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              classification: "UNCLASSIFIED"
    # Block all external egress
    - to: []
      ports: []
```

## Operations

### Health Monitoring

#### System Health Checks

```bash
# Federal health status
$ curl -k https://conductor-federal.intelgraph-federal.svc.cluster.local:8000/api/federal/health

{
  "status": "healthy",
  "fips": {
    "enabled": true,
    "level": "FIPS_140_2_LEVEL_3",
    "hsmConnected": true,
    "keyRotationStatus": "current"
  },
  "airGap": {
    "enabled": true,
    "mode": "STRICT",
    "networkIsolated": true,
    "componentCount": 47
  }
}
```

#### Compliance Status

```bash
# FIPS compliance report
$ curl -k https://conductor-federal.intelgraph-federal.svc.cluster.local:8000/api/federal/compliance-status

{
  "fipsEnabled": true,
  "keyCount": 12,
  "keys": [...],
  "auditTrail": [...]
}
```

### Offline Updates

#### Update Package Structure

```
offline-update-package/
├── manifest.json          # Package manifest with signatures
├── components/            # Updated application components
│   ├── conductor@1.0.1
│   └── marketplace@1.0.1
├── sboms/                 # Software Bill of Materials
│   ├── conductor-1.0.1.sbom.json
│   └── marketplace-1.0.1.sbom.json
├── signatures/            # Detached signatures
│   ├── conductor-1.0.1.sig
│   └── marketplace-1.0.1.sig
└── policies/              # Updated OPA policies
    └── security-policies-v2.rego
```

#### Apply Offline Update

```bash
# Transfer update package via secure media
$ kubectl cp secure-usb-mount/update-package.tar.gz \
  conductor-federal-0:/tmp/

# Process offline update
$ curl -k -X POST \
  https://conductor-federal.intelgraph-federal.svc.cluster.local:8000/api/federal/offline-update \
  -H "Content-Type: application/json" \
  -d '{"updatePackagePath": "/tmp/update-package"}'

{
  "success": true,
  "updateId": "update-1694525400",
  "verificationResults": [
    {
      "component": "conductor@1.0.1",
      "verified": true,
      "checks": {
        "sbom": true,
        "signature": true,
        "hash": true,
        "policy": true
      }
    }
  ]
}
```

### Break-Glass Procedures

#### Emergency Access Activation

```bash
# Initiate break-glass session
$ curl -k -X POST \
  https://conductor-federal.intelgraph-federal.svc.cluster.local:8000/api/federal/break-glass \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Critical security incident - unauthorized access detected",
    "initiator": "john.smith@agency.gov",
    "duration": 4,
    "approvers": ["security.officer@agency.gov", "deputy.isso@agency.gov"]
  }'

{
  "success": true,
  "sessionId": "breakglass-1694525400-xyz789",
  "message": "Break-glass session initiated. Approval pending.",
  "approvalRequired": true
}
```

See [Break-Glass Procedures](./tools/federal/break-glass-procedure.md) for detailed emergency response procedures.

## Security Hardening

### Pod Security Standards

```yaml
# federal-pod-security.yaml
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault

  containers:
    - name: conductor
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
        seccompProfile:
          type: RuntimeDefault
```

### Resource Limits

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
    # FIPS operations require more CPU
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

## Compliance & Certification

### FedRAMP Authorization

- **Security Control Implementation**: NIST SP 800-53 Rev 5
- **Continuous Monitoring**: ConMon scanning and vulnerability management
- **Annual Assessment**: Independent security assessment required

### ATO Documentation Required

- **System Security Plan (SSP)**: Detailed security implementation
- **Security Assessment Report (SAR)**: Independent security testing results
- **Plan of Actions & Milestones (POA&M)**: Remediation tracking
- **Contingency Plan**: Disaster recovery and business continuity

### Audit Requirements

```bash
# Generate compliance report
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  /opt/intelgraph/tools/generate-compliance-report.sh

# Export audit logs for review
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  tar -czf /tmp/audit-export-$(date +%Y%m%d).tar.gz /app/audit/synced/

# Verify WORM storage integrity
$ aws s3api list-object-versions --bucket federal-audit-worm-bucket \
  --prefix "audit-logs/$(date +%Y/%m/%d)/" \
  --query 'Versions[?IsLatest==`true`].[Key,LastModified,ObjectLockRetainUntilDate]'
```

## Troubleshooting

### Common Issues

#### FIPS Validation Failures

```bash
# Check FIPS kernel module
$ cat /proc/sys/crypto/fips_enabled

# Verify Node.js FIPS mode
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  node -p "crypto.getFips()"

# HSM connectivity test
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  /opt/cloudhsm/bin/cloudhsm_mgmt_util
```

#### Air-Gap Network Issues

```bash
# Verify network isolation
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  timeout 5 curl -I https://google.com
# Should timeout or fail

# Check internal connectivity
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  nc -zv postgres-federal.intelgraph-federal.svc.cluster.local 5432
```

#### Break-Glass Session Problems

```bash
# List active sessions
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  curl -k https://localhost:8000/api/federal/break-glass/sessions

# Force terminate hung session
$ kubectl exec -n intelgraph-federal conductor-federal-0 -- \
  curl -k -X POST https://localhost:8000/api/federal/break-glass/terminate \
  -d '{"sessionId":"breakglass-xxx","reason":"Emergency termination"}'
```

## Support

### Government Support Channels

- **FedRAMP PMO**: fedramp@gsa.gov
- **CISA**: central@cisa.dhs.gov
- **Vendor Support**: Enterprise support with clearance-verified personnel

### Emergency Contacts

- **24/7 SOC**: Cleared security operations center
- **CISO On-Call**: Agency CISO emergency line
- **Incident Response**: Federal incident response team

---

**Classification**: UNCLASSIFIED  
**Version**: 1.0  
**Last Updated**: September 2024  
**Distribution**: Authorized Government Personnel Only
