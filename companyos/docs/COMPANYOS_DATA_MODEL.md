# CompanyOS Data Model & Lifecycle

> **Implements**: R2 - Compliance & Data Lifecycle Notes v0
> **Last Updated**: 2024-12-08
> **Status**: Living Document

## Overview

This document describes the CompanyOS data model, classification, retention policies, and data lifecycle management. It serves as the authoritative reference for compliance and security reviews.

## Data Classification

### Classification Levels

| Level | Description | Examples | Handling Requirements |
|-------|-------------|----------|----------------------|
| **Public** | Non-sensitive, can be shared externally | Product documentation, public APIs | Standard handling |
| **Internal** | Internal business data | Tenant names, aggregate metrics | Internal access only |
| **Confidential** | Sensitive business data | Contact emails, billing info | Encrypted at rest |
| **Restricted** | Highly sensitive data | API keys, credentials | Encrypted, audit logged |
| **PII** | Personal Identifiable Information | Email, name, IP address | GDPR/CCPA compliant |

### Data Fields by Classification

#### Tenant Data

| Field | Classification | PII | Encrypted | Retention |
|-------|---------------|-----|-----------|-----------|
| `id` | Internal | No | No | Indefinite |
| `externalId` | Internal | No | No | Indefinite |
| `name` | Internal | No | No | Indefinite |
| `displayName` | Internal | No | No | Indefinite |
| `status` | Internal | No | No | Indefinite |
| `tier` | Internal | No | No | Indefinite |
| `region` | Internal | No | No | Indefinite |
| `primaryContactEmail` | Confidential | **Yes** | Yes | 30 days post-deletion |
| `primaryContactName` | Confidential | **Yes** | Yes | 30 days post-deletion |
| `billingEmail` | Confidential | **Yes** | Yes | 7 years (regulatory) |
| `metadata` | Varies | Possible | Conditional | 30 days post-deletion |
| `createdAt` | Internal | No | No | Indefinite |
| `deletedAt` | Internal | No | No | Indefinite |

#### Tenant Admin Data

| Field | Classification | PII | Encrypted | Retention |
|-------|---------------|-----|-----------|-----------|
| `userId` | Internal | No | No | 30 days post-deletion |
| `email` | Confidential | **Yes** | Yes | 30 days post-deletion |
| `displayName` | Confidential | **Yes** | Yes | 30 days post-deletion |
| `role` | Internal | No | No | 30 days post-deletion |
| `invitedAt` | Internal | No | No | 30 days post-deletion |

#### Audit Events

| Field | Classification | PII | Encrypted | Retention |
|-------|---------------|-----|-----------|-----------|
| `actorId` | Internal | No | No | 365 days |
| `actorEmail` | Confidential | **Yes** | Yes | 365 days |
| `ipAddress` | Confidential | **Yes** | Yes | 90 days |
| `userAgent` | Internal | No | No | 90 days |
| `details` | Varies | Possible | Conditional | 365 days |
| `occurredAt` | Internal | No | No | 365 days |

## Retention Policies

### Standard Retention Periods

| Data Type | Active | Post-Deletion | Regulatory |
|-----------|--------|---------------|------------|
| Tenant Core Data | Indefinite | 30 days | N/A |
| User/Admin Data | Active tenure | 30 days | N/A |
| Audit Logs | 365 days | 365 days | 7 years for SOX |
| Access Logs | 90 days | 90 days | N/A |
| Billing Records | Active | 7 years | 7 years (tax) |
| Security Events | 365 days | 365 days | 7 years |

### Retention by Tier

| Tier | Audit Log Retention | Access Log Retention |
|------|---------------------|---------------------|
| Starter | 90 days | 30 days |
| Bronze | 180 days | 60 days |
| Silver | 365 days | 90 days |
| Gold | 730 days | 180 days |
| Enterprise | Custom (up to 7 years) | Custom |

## Data Lifecycle

### Tenant Lifecycle States

```
┌──────────┐     ┌──────────┐     ┌─────────────┐     ┌────────────────────┐     ┌─────────┐
│ PENDING  │ ──▶ │  ACTIVE  │ ──▶ │  SUSPENDED  │ ──▶ │ DELETION_REQUESTED │ ──▶ │ DELETED │
└──────────┘     └──────────┘     └─────────────┘     └────────────────────┘     └─────────┘
     │                 │                 │                       │
     │                 │                 │                       │
     └────────────────►│◄────────────────┘                       │
                       │                                         │
                       └────────────────────────────────────────►│
```

### State Descriptions

| State | Data Access | Write Access | API Response |
|-------|-------------|--------------|--------------|
| `PENDING` | Full | Full | Normal |
| `ACTIVE` | Full | Full | Normal |
| `SUSPENDED` | Read-only | Blocked | 403 on writes |
| `DELETION_REQUESTED` | Read-only | Blocked | 403 + warning |
| `DELETED` | None | None | 404 |

### Deletion Process

1. **Soft Delete** (Current Implementation)
   - Status set to `DELETED`
   - Data retained but inaccessible via API
   - Tombstone record maintained
   - Deletion timestamp recorded

2. **Hard Delete** (Future - Not Yet Implemented)
   - Remove all tenant data from primary storage
   - Remove from backups (within retention window)
   - Generate deletion certificate
   - Maintain audit log of deletion

### Data Deletion Timeline

```
Day 0: Deletion requested
       - Status → DELETION_REQUESTED
       - APIs return warning headers
       - Admin notification sent

Day 30: Soft delete executed
        - Status → DELETED
        - Data access blocked
        - Backup retention begins

Day 60: Backup purge (if configured)
        - Removed from incremental backups
        - Retained in compliance archives if required

Day 90+: Full purge (Enterprise only)
         - Complete data erasure
         - Deletion certificate generated
```

## Region & Residency

### Supported Regions

| Region | Code | Data Center | Residency Class |
|--------|------|-------------|-----------------|
| US East | `us-east-1` | Virginia | Standard |
| US West | `us-west-2` | Oregon | Standard |
| EU West | `eu-west-1` | Ireland | GDPR |
| EU Central | `eu-central-1` | Frankfurt | GDPR |
| APAC | `ap-southeast-1` | Singapore | Standard |

### Residency Classes

| Class | Description | Cross-Region Access |
|-------|-------------|---------------------|
| `standard` | Default, US-based | Allowed |
| `restricted` | Limited regions | With approval |
| `sovereign` | Single region only | Blocked |

### Cross-Region Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                     Data Flow Rules                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  standard tenant:                                        │
│    ✅ Read from any region                              │
│    ✅ Write to home region                              │
│    ✅ Export with approval                              │
│                                                          │
│  restricted tenant:                                      │
│    ✅ Read from allowed regions                         │
│    ⚠️  Write to home region only                        │
│    ⚠️  Export requires token                            │
│                                                          │
│  sovereign tenant:                                       │
│    ✅ Read from home region only                        │
│    ✅ Write to home region only                         │
│    ❌ Export blocked                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Data Export Rights

### Export Types

| Export Type | Availability | Format | Contains PII |
|-------------|--------------|--------|--------------|
| Tenant Config | All tiers | JSON | Yes |
| Audit Logs | Silver+ | JSON/CSV | Yes |
| Usage Metrics | All tiers | JSON | No |
| Full Data Export | Enterprise | Custom | Yes |

### Export Process

1. User requests export via API or UI
2. OPA policy validates permission
3. Export job queued
4. PII fields encrypted in export
5. Download link provided (24h expiry)
6. Export logged in audit trail

## Compliance Considerations

### GDPR Compliance

- **Right to Access**: Full data export available
- **Right to Rectification**: Update APIs available
- **Right to Erasure**: Deletion request flow
- **Data Portability**: JSON export format
- **Consent**: Managed at tenant level

### SOC 2 Considerations

- All access logged in audit trail
- Encryption at rest for sensitive data
- Role-based access control
- Regular access reviews required

### HIPAA Considerations (If Applicable)

- PHI fields require additional encryption
- Access logging with user attribution
- Minimum necessary access principle
- BAA required for covered entities

## Future Enhancements

### Planned (Next Sprints)

1. **Hard Delete Implementation**
   - Complete data purge workflow
   - Deletion certificates
   - Backup coordination

2. **Data Residency Enforcement**
   - Runtime region validation
   - Cross-region request blocking
   - Residency audit logging

3. **Enhanced Export**
   - Scheduled exports
   - Incremental exports
   - Custom field selection

### Under Consideration

1. **Data Masking**
   - PII masking in non-production
   - Role-based field visibility
   - Audit log redaction

2. **Retention Automation**
   - Automated data aging
   - Compliance-driven purges
   - Retention policy enforcement

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2024-12-08 | Claude | Initial draft |

## References

- [Tenant Lifecycle API](./api/tenant-lifecycle.md)
- [OPA Authorization Policies](../policies/authz.rego)
- [Audit Service Documentation](./api/audit-service.md)
- [GDPR Compliance Guide](./compliance/gdpr.md)
