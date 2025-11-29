# Defense-in-Depth Architecture for Air-Gapped Deployment

> **Summit IntelGraph Platform - Air-Gapped Deployment Guide**
>
> Last Updated: 2025-11-29
> Classification: INTERNAL USE ONLY

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Security Zones](#security-zones)
4. [Network Segmentation](#network-segmentation)
5. [Data Transfer Controls](#data-transfer-controls)
6. [Malware Scanning](#malware-scanning)
7. [SNMP Health Monitoring](#snmp-health-monitoring)
8. [Supply Chain Security](#supply-chain-security)
9. [OT Sensor Integration](#ot-sensor-integration)
10. [SIEM Integration](#siem-integration)
11. [Deployment Procedures](#deployment-procedures)
12. [Operational Runbooks](#operational-runbooks)
13. [Compliance Mapping](#compliance-mapping)

---

## Executive Summary

This document describes the defense-in-depth architecture for deploying Summit IntelGraph in air-gapped environments. The architecture implements multiple layers of security controls to protect against threats at every level, from network infrastructure to application deployment.

### Key Security Achievements

| Metric | Target | Implementation |
|--------|--------|----------------|
| Malware Reduction | 91% | Multi-engine scanning stations |
| Network Isolation | Complete | VPC with no internet gateway |
| Supply Chain | SLSA Level 3 | Cosign-signed attestations |
| Data Transfer | Controlled | Removable media with scanning |
| Monitoring | Comprehensive | SNMP + Prometheus + SIEM |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AIR-GAPPED ENVIRONMENT                              │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  DATA TRANSFER  │    │   PRODUCTION    │    │   SECURITY      │         │
│  │     ZONE        │───▶│     ZONE        │───▶│   OPERATIONS    │         │
│  │                 │    │                 │    │    (SIEM)       │         │
│  │ • Scanning      │    │ • IntelGraph    │    │                 │         │
│  │ • Media Control │    │ • Databases     │    │ • Log Collect   │         │
│  │ • Quarantine    │    │ • API Gateway   │    │ • OT Backup     │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
│                    ┌─────────────────────────────┐                          │
│                    │      MONITORING ZONE        │                          │
│                    │                             │                          │
│                    │  • SNMP Exporter           │                          │
│                    │  • Proxy Chain             │                          │
│                    │  • Prometheus              │                          │
│                    └─────────────────────────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Zero Trust**: No implicit trust between zones; all traffic authenticated and encrypted
2. **Least Privilege**: Minimal permissions for all components
3. **Defense in Depth**: Multiple overlapping security controls
4. **Immutable Infrastructure**: No runtime modifications
5. **Complete Audit Trail**: All actions logged and verifiable

---

## Security Zones

### Zone 1: Data Transfer Zone (`intelgraph-scanning`)

**Purpose**: Secure ingress point for data entering the air-gapped environment

**Security Controls**:
- Removable media scanning (multi-engine)
- File type validation
- Digital signature verification
- Quarantine for suspicious files
- Chain of custody logging

**Network Rules**:
```yaml
Ingress:
  - From: Physical media handlers only
  - Ports: 8080/TCP (scanner API)
Egress:
  - To: Production Zone (verified artifacts only)
  - To: SIEM Zone (audit logs)
```

### Zone 2: Production Zone (`intelgraph-airgap`)

**Purpose**: Core IntelGraph platform operations

**Security Controls**:
- Pod Security Standards (Restricted)
- Network policies (default deny)
- Image signature verification
- SLSA Level 3 provenance
- Runtime security monitoring

**Components**:
- IntelGraph Server
- IntelGraph Client
- API Gateway
- Neo4j Database
- PostgreSQL Database
- Redis Cache
- Copilot Service

### Zone 3: Security Operations Zone (`intelgraph-siem`)

**Purpose**: Isolated security monitoring and log retention

**Security Controls**:
- Ingress-only design (no egress)
- Immutable log storage
- 7-year retention for compliance
- Integrity verification (SHA-256)

**Data Sources**:
- Application logs
- Security events
- OT sensor data
- SNMP traps
- Audit trails

### Zone 4: Monitoring Zone (`intelgraph-monitoring`)

**Purpose**: Health monitoring and alerting

**Components**:
- SNMP Exporter
- Prometheus
- Alertmanager
- Proxy Chain (for sensor management)

---

## Network Segmentation

### VPC Design

```
VPC CIDR: 10.100.0.0/16 (65,536 addresses)

Subnets:
├── 10.100.1.0/24  - Production Zone (AZ-a)
├── 10.100.2.0/24  - Production Zone (AZ-b)
├── 10.100.3.0/24  - Production Zone (AZ-c)
├── 10.100.10.0/24 - Scanning Stations
├── 10.100.20.0/24 - Administration
├── 10.100.30.0/24 - Monitoring
└── 10.100.40.0/24 - OT Sensors
```

### Network Policies

All namespaces implement **default-deny** policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Explicit allow policies then permit only required traffic.

### Service Mesh (mTLS)

All inter-service communication uses mutual TLS:

```yaml
# Peer Authentication
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: intelgraph-airgap
spec:
  mtls:
    mode: STRICT
```

---

## Data Transfer Controls

### Removable Media Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Media     │────▶│  Register   │────▶│   Scan      │────▶│  Transfer   │
│   Insert    │     │  & Log      │     │   (91%+)    │     │  to Prod    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Quarantine │
                                        │  (if threat)│
                                        └─────────────┘
```

### Allowed Device Types

| Device Type | Vendor Whitelist | Requirements |
|-------------|------------------|--------------|
| USB Storage | Kingston, SanDisk, Transcend | Hardware encryption, tamper-evident |
| Optical Media | CD-R, DVD-R | Write-protected |
| SD Cards | **BLOCKED** | Not permitted |

### File Type Restrictions

**Allowed (Inbound)**:
- `.tar.gz`, `.tar.xz`, `.zip` (Archives)
- `.sig` (Signatures)
- `.sbom` (SBOMs)
- `.json`, `.yaml`, `.yml` (Configuration)

**Blocked**:
- Executables (`.exe`, `.dll`)
- Scripts (`.ps1`, `.bat`, `.sh`)
- All other file types

---

## Malware Scanning

### Multi-Engine Scanning (91% Reduction Target)

The scanning station employs multiple engines for comprehensive detection:

| Engine | Purpose | Update Frequency |
|--------|---------|------------------|
| ClamAV | Signature-based AV | Manual (air-gapped) |
| YARA | Rule-based detection | Manual |
| Hash Database | Known malware hashes | Weekly import |
| Static Analysis | PE/ELF analysis | Built-in |

### Scanning Configuration

```yaml
scanning:
  engines:
    minimum: 2  # At least 2 engines must scan
    required:
      - clamav
      - yara
  thresholds:
    blockOnDetection: true  # Any detection = block
    scanTimeoutTotal: 600s
  quarantine:
    enabled: true
    retentionDays: 90
    encryptionKey: <KMS-managed>
```

### Detection Metrics

```promql
# Total files scanned
sum(rate(scanner_files_total[1h]))

# Detection rate by engine
sum by (engine) (rate(scanner_detections_total[1h]))

# Malware reduction rate
1 - (
  sum(rate(scanner_detections_passed[1h])) /
  sum(rate(scanner_files_total[1h]))
)
```

---

## SNMP Health Monitoring

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Target     │────▶│    SNMP      │────▶│  Prometheus  │
│   Devices    │     │   Exporter   │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       │                                         ▼
       │                               ┌──────────────┐
       └─────────────────────────────▶│ SNMP Trap    │
                                       │ Receiver     │
                                       └──────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │    SIEM      │
                                       └──────────────┘
```

### Monitored Targets

| Target Type | Module | Metrics |
|-------------|--------|---------|
| Linux Servers | `linux_server` | CPU, Memory, Disk, Network |
| Network Devices | `network_device` | Interface stats, CPU, Memory |
| OT Sensors | `ot_sensor` | Status, Temperature, Sync time |
| Storage | `storage` | Capacity, Usage, Health |

### Critical Alerts

```yaml
- alert: OTSensorOffline
  expr: otSensorStatus != 1
  for: 2m
  severity: critical

- alert: HighCPUUsage
  expr: hrProcessorLoad > 90
  for: 10m
  severity: warning

- alert: StorageSpaceLow
  expr: (hrStorageUsed / hrStorageSize) * 100 > 85
  for: 5m
  severity: warning
```

---

## Supply Chain Security

### SLSA Level 3 Requirements

| Requirement | Implementation |
|-------------|----------------|
| Scripted Build | GitHub Actions workflows |
| Hosted Build | GitHub-hosted runners |
| Audit Logs | GitHub audit log |
| Hermetic Build | Docker with pinned deps |
| Reproducible | Deterministic builds |
| Isolated | Ephemeral runners |
| Signed Provenance | Cosign keyless signing |

### Verification Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Build     │────▶│   Sign      │────▶│   Verify    │────▶│   Deploy    │
│   Image     │     │   (Cosign)  │     │   (Kyverno) │     │   to K8s    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
 ┌─────────┐        ┌─────────┐        ┌─────────┐
 │  SBOM   │        │  SLSA   │        │  Vuln   │
 │ (CycloneDX)      │ Provenance│       │  Scan   │
 └─────────┘        └─────────┘        └─────────┘
```

### Kyverno Policy Enforcement

```yaml
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-slsa-provenance
      verifyImages:
        - attestations:
            - type: https://slsa.dev/provenance/v1
              conditions:
                - key: "{{ builder.id }}"
                  operator: AnyIn
                  value:
                    - "https://github.com/slsa-framework/slsa-github-generator/..."
```

---

## OT Sensor Integration

### Proxy Chain Architecture

OT sensors communicate through a multi-hop proxy chain for defense-in-depth:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   OT     │────▶│  Edge    │────▶│  Zone    │────▶│  Core    │────▶ SIEM
│ Sensor   │     │  Proxy   │     │  Proxy   │     │  Proxy   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
   Tier 0           Tier 1           Tier 2           Tier 3
```

### Security at Each Hop

| Tier | Security Controls |
|------|-------------------|
| Edge Proxy | mTLS, Rate limiting, Content inspection |
| Zone Proxy | mTLS, CN validation, Payload sanitization |
| Core Proxy | mTLS, Full audit logging, Final validation |

### Backup Policy

```yaml
retention:
  safety-critical: 10years  # Immutable
  operational: 7years       # Immutable
  diagnostic: 2years        # Mutable
```

---

## SIEM Integration

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       SIEM COLLECTOR                         │
├─────────────────────────────────────────────────────────────┤
│  Inputs:                                                     │
│  ├── TCP/5044  ← OT Sensor Data (Beats)                     │
│  ├── UDP/514   ← Syslog                                     │
│  ├── TCP/6514  ← Syslog TLS                                 │
│  └── UDP/162   ← SNMP Traps                                 │
├─────────────────────────────────────────────────────────────┤
│  Processing:                                                 │
│  ├── JSON parsing                                           │
│  ├── Integrity hashing (SHA-256)                            │
│  ├── Chain of custody metadata                              │
│  └── Sensitive field redaction                              │
├─────────────────────────────────────────────────────────────┤
│  Outputs:                                                    │
│  └── Local encrypted storage (7+ year retention)            │
└─────────────────────────────────────────────────────────────┘
```

### Chain of Custody

Every log entry includes:

```json
{
  "chain_of_custody": {
    "ingestion_time": "2025-11-29T12:00:00Z",
    "collector": "siem-collector",
    "zone": "isolated-siem",
    "compliance": "air-gapped"
  },
  "integrity": {
    "hash": "sha256:abc123...",
    "algorithm": "SHA-256"
  },
  "backup": {
    "integrity_hash": "sha256:def456...",
    "timestamp": "2025-11-29T12:00:01Z",
    "retention_class": "regulatory-7yr"
  }
}
```

---

## Deployment Procedures

### Initial Deployment

1. **Prepare Air-Gapped Environment**
   ```bash
   # Apply Terraform infrastructure
   cd infra/airgap/terraform
   terraform init
   terraform plan -out=plan.tfplan
   terraform apply plan.tfplan
   ```

2. **Deploy Kubernetes Components**
   ```bash
   # Apply namespaces and policies
   kubectl apply -f kubernetes/namespace.yaml
   kubectl apply -f kubernetes/network-policies.yaml

   # Deploy scanning infrastructure
   kubectl apply -f kubernetes/malware-scanning-station.yaml
   kubectl apply -f kubernetes/removable-media-controller.yaml

   # Deploy monitoring
   kubectl apply -f kubernetes/snmp-monitoring.yaml
   kubectl apply -f kubernetes/proxy-chain-sensor.yaml

   # Deploy SIEM
   kubectl apply -f kubernetes/siem-ot-backup.yaml

   # Apply SLSA/SBOM policies
   kubectl apply -f sbom/slsa-sbom-policy.yaml
   ```

3. **Verify Deployment**
   ```bash
   # Check all pods
   kubectl get pods -n intelgraph-airgap
   kubectl get pods -n intelgraph-scanning
   kubectl get pods -n intelgraph-monitoring
   kubectl get pods -n intelgraph-siem

   # Verify network policies
   kubectl get networkpolicies --all-namespaces

   # Test scanning station
   curl -X POST http://malware-scanner:8080/scan \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### Image Updates

1. **Generate SBOM on connected system**
   ```bash
   ./scripts/generate-sbom.sh -a -f both myimage:v1.0.0
   ```

2. **Transfer via scanning station**
   - Copy signed images and SBOMs to approved removable media
   - Insert media into scanning station
   - Wait for scan completion (expect ~10 minutes)
   - Verify scan results

3. **Import to air-gapped registry**
   ```bash
   # After successful scan, import to ECR
   docker load < scanned-images.tar
   docker push $ECR_REGISTRY/myimage:v1.0.0
   ```

---

## Operational Runbooks

### Runbook: Media Scan Failure

**Trigger**: Malware detected during scan

**Steps**:
1. Quarantine media immediately
2. Document detection details
3. Notify security team
4. Investigate source of media
5. Update threat intelligence
6. Clear quarantine after 90 days (or destroy media)

### Runbook: SNMP Target Down

**Trigger**: `SNMPTargetDown` alert

**Steps**:
1. Verify network connectivity
2. Check target device status
3. Verify SNMP configuration
4. Restart SNMP agent if needed
5. Escalate if unresolved

### Runbook: OT Sensor Sync Stale

**Trigger**: `OTSensorSyncStale` alert

**Steps**:
1. Check proxy chain health
2. Verify sensor connectivity
3. Review sensor logs
4. Restart sensor if needed
5. Escalate to OT team

---

## Compliance Mapping

| Control | NIST 800-53 | FedRAMP | IEC 62443 |
|---------|-------------|---------|-----------|
| Network Isolation | SC-7 | SC-7 | SR 5.1 |
| Malware Protection | SI-3 | SI-3 | SR 3.2 |
| Media Protection | MP-2, MP-4 | MP-2, MP-4 | SR 2.3 |
| Audit Logging | AU-2, AU-12 | AU-2, AU-12 | SR 6.1 |
| Supply Chain | SA-12, SR-3 | SA-12, SR-3 | SR 4.1 |
| Access Control | AC-3, AC-4 | AC-3, AC-4 | SR 2.1 |
| Integrity | SI-7 | SI-7 | SR 3.4 |

---

## Appendix A: Configuration Files

| File | Purpose |
|------|---------|
| `terraform/main.tf` | AWS infrastructure |
| `terraform/variables.tf` | Configuration variables |
| `kubernetes/namespace.yaml` | Kubernetes namespaces |
| `kubernetes/network-policies.yaml` | Network segmentation |
| `kubernetes/malware-scanning-station.yaml` | Scanner deployment |
| `kubernetes/removable-media-controller.yaml` | Media controls |
| `kubernetes/snmp-monitoring.yaml` | SNMP exporter |
| `kubernetes/proxy-chain-sensor.yaml` | Sensor proxy chain |
| `kubernetes/siem-ot-backup.yaml` | SIEM collector |
| `sbom/slsa-sbom-policy.yaml` | SLSA/SBOM policies |
| `scripts/generate-sbom.sh` | SBOM generation |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| Air-Gapped | Network isolated from internet/external networks |
| SBOM | Software Bill of Materials |
| SLSA | Supply-chain Levels for Software Artifacts |
| OT | Operational Technology |
| SIEM | Security Information and Event Management |
| mTLS | Mutual TLS authentication |
| SNMP | Simple Network Management Protocol |

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-29 | DevOps | Initial release |
