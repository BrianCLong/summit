# IntelGraph Data Flow Security

## Overview

This document describes the data flows within the IntelGraph platform and the security controls applied at each stage to protect sensitive intelligence data.

## Data Classification

### Classification Levels

1. **Public** - Marketing materials, documentation
2. **Internal** - Configuration, logs, metadata
3. **Confidential** - User data, analysis results
4. **Restricted** - Intelligence sources, classified analysis
5. **Top Secret** - National security information

### Handling Requirements

| Classification | Encryption    | Access Control | Retention | Backup     |
| -------------- | ------------- | -------------- | --------- | ---------- |
| Public         | Optional      | Public         | 7 years   | Standard   |
| Internal       | TLS           | Authenticated  | 5 years   | Standard   |
| Confidential   | TLS + AES-256 | Role-based     | 3 years   | Encrypted  |
| Restricted     | TLS + AES-256 | Need-to-know   | 10 years  | Air-gapped |
| Top Secret     | TLS + AES-256 | Compartmented  | 25 years  | Classified |

## Data Flow Diagrams

### 1. User Authentication Flow

```
User → WAF → Load Balancer → API Gateway → Auth Service → Database
│                                          │
└─── MFA Token ──────────────────────────┘
```

**Security Controls**:

- TLS 1.3 end-to-end encryption
- JWT token validation with short expiry
- Multi-factor authentication verification
- Rate limiting on authentication attempts
- Audit logging of all authentication events

### 2. Intelligence Data Ingestion

```
External Source → API Gateway → Validation → Enrichment → Classification → Storage
│                               │            │             │              │
│                               ├─ Schema    ├─ AI Analysis ├─ Auto-tag    ├─ Encrypted DB
│                               ├─ Sanitize  ├─ Entity Ext. ├─ Manual Rev. ├─ Search Index
│                               └─ Virus Scan└─ Relationship└─ Workflow    └─ Audit Log
```

**Security Controls**:

- Input validation and sanitization
- Malware scanning of uploaded files
- Automated content classification
- Human review for sensitive data
- Encryption at rest (AES-256-GCM)
- Immutable audit trail

### 3. Analysis and Query Flow

```
User Query → API Gateway → Query Parser → Access Control → Database → Results
│                          │             │               │           │
├─ Intent Analysis ────────┘             ├─ RBAC Check   ├─ Row-level │
├─ Parameter Validation                   ├─ Data Masking ├─ Security  │
└─ Rate Limiting                          └─ Audit Log    └─ Filter────┘
                                                                    │
User ← Response Filter ← Result Enrichment ← Classification ←──────┘
```

**Security Controls**:

- Query parameterization to prevent injection
- Role-based access control (RBAC)
- Row-level security policies
- Data masking for sensitive fields
- Result filtering based on user clearance
- Query and result audit logging

### 4. Export and Sharing Flow

```
Export Request → Approval → Data Extraction → Redaction → Format → Delivery
│                │          │                │           │        │
├─ Justification ├─ Manager ├─ Access Check  ├─ Auto     ├─ PDF   ├─ Secure Email
├─ Time Limit    ├─ Review  ├─ Data Decrypt  ├─ Manual   ├─ JSON  ├─ Portal Download
└─ Audit Log     └─ Approve └─ Apply Filters └─ Verify   └─ XML   └─ API Endpoint
```

**Security Controls**:

- Approval workflow for sensitive exports
- Automated and manual redaction processes
- Watermarking and tracking of exported documents
- Secure delivery mechanisms
- Export monitoring and alerting
- Comprehensive audit trail

## Network Security

### Network Segmentation

```
Internet → WAF → DMZ → Application Tier → Database Tier → Backup Tier
│          │     │    │                 │               │
│          │     │    ├─ Web Servers    ├─ Primary DB   ├─ Cold Storage
│          │     │    ├─ API Gateway    ├─ Read Replica ├─ Tape Archive
│          │     │    └─ Load Balancer  └─ Cache Layer  └─ Offsite Backup
```

**Security Controls**:

- Firewall rules restricting inter-tier communication
- Network access control lists (NACLs)
- VPN access for administrative functions
- Intrusion detection and prevention systems
- Network monitoring and traffic analysis

### Data in Transit

- **External Communications**: TLS 1.3 with perfect forward secrecy
- **Internal Services**: Mutual TLS (mTLS) with service mesh
- **Database Connections**: TLS with certificate pinning
- **File Transfers**: SFTP or HTTPS with integrity verification
- **Backups**: Encrypted transport to secure storage

## Data at Rest Protection

### Database Encryption

```
Application → Connection Pool → TLS → Database Proxy → Encrypted Storage
│                               │                    │
├─ Connection Encryption ──────┘                    ├─ Table-level Encryption
├─ Credential Vault                                  ├─ Column-level Encryption
└─ Connection Monitoring                             └─ Transparent Data Encryption
```

**Encryption Specifications**:

- **Algorithm**: AES-256-GCM with AEAD
- **Key Management**: AWS KMS / HashiCorp Vault
- **Key Rotation**: Automatic monthly rotation
- **Key Escrow**: Secure key backup and recovery

### File Storage Encryption

```
File Upload → Virus Scan → Classification → Encryption → Storage → Indexing
│             │           │               │            │         │
├─ Size Check ├─ Multiple ├─ Auto-tag     ├─ AES-256   ├─ S3     ├─ Search Engine
├─ Type Valid ├─ Engines  ├─ Manual Rev.  ├─ Per-file  ├─ Backup ├─ Metadata Only
└─ Quarantine └─ Sandbox  └─ Approval     └─ Key Mgmt  └─ Archive└─ Access Control
```

## Access Control Matrix

### Role-Based Access Control (RBAC)

| Role           | Data Access       | Export            | Admin      | Audit    |
| -------------- | ----------------- | ----------------- | ---------- | -------- |
| Analyst        | Read Confidential | Approval Required | No         | No       |
| Senior Analyst | Read Restricted   | Self-Approve      | Limited    | No       |
| Manager        | Read All          | Approve Others    | Department | Read     |
| Admin          | Technical Access  | No                | System     | No       |
| Auditor        | Read Audit Logs   | Audit Only        | No         | Full     |
| Security       | Security Logs     | Security Only     | Security   | Security |

### Attribute-Based Access Control (ABAC)

Additional controls based on:

- **Time**: Working hours, emergency access
- **Location**: Geographic restrictions, secure facilities
- **Device**: Managed devices, security compliance
- **Classification**: Clearance level, need-to-know
- **Context**: VPN connection, multi-factor authentication

## Monitoring and Alerting

### Security Events

- **Authentication Failures**: Failed login attempts, account lockouts
- **Authorization Violations**: Access denied events, privilege escalations
- **Data Access**: Sensitive data queries, bulk exports
- **System Changes**: Configuration updates, software deployments
- **Security Incidents**: Malware detection, anomalous behavior

### Data Loss Prevention (DLP)

```
Outbound Data → Content Analysis → Policy Check → Action
│                │                 │             │
├─ Email        ├─ Pattern Match   ├─ Allow      ├─ Log
├─ File Share   ├─ Fingerprinting  ├─ Block      ├─ Alert
├─ Web Upload   ├─ ML Detection    ├─ Quarantine ├─ Encrypt
└─ API Export   └─ Context Analysis└─ Redact     └─ Approve
```

## Compliance and Audit

### Audit Trail Requirements

All data access and modifications must include:

- **Who**: User identity and authentication method
- **What**: Specific data accessed or action performed
- **When**: Timestamp with timezone
- **Where**: Source IP address and geolocation
- **Why**: Business justification or request ID
- **How**: Access method and system path

### Log Retention

| Log Type        | Retention Period | Storage Location | Encryption |
| --------------- | ---------------- | ---------------- | ---------- |
| Authentication  | 7 years          | SIEM + Archive   | AES-256    |
| Data Access     | 10 years         | SIEM + Archive   | AES-256    |
| System Events   | 5 years          | SIEM + Archive   | AES-256    |
| Security Events | 10 years         | SIEM + Archive   | AES-256    |
| Audit Logs      | 25 years         | Immutable Store  | AES-256    |

## Incident Response

### Data Breach Response

1. **Detection**: Automated alerts, manual discovery
2. **Containment**: Isolate affected systems, preserve evidence
3. **Assessment**: Determine scope, impact, and root cause
4. **Notification**: Internal teams, regulators, affected parties
5. **Recovery**: Restore services, implement additional controls
6. **Lessons Learned**: Update procedures, improve defenses

### Business Continuity

- **RTO** (Recovery Time Objective): 4 hours for critical systems
- **RPO** (Recovery Point Objective): 1 hour maximum data loss
- **Backup Strategy**: 3-2-1 backup rule with geographic distribution
- **Disaster Recovery**: Hot standby in alternate region

## Review and Maintenance

This document is reviewed quarterly and updated for:

- New data sources and integrations
- Changes in data classification requirements
- Regulatory compliance updates
- Security incident lessons learned
- Technology stack changes

**Last Updated**: September 2025
**Next Review**: December 2025
**Owner**: Data Protection Team
