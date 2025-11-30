# Audit Black Box Service

Immutable audit "flight recorder" for the IntelGraph platform with tamper-evident storage.

## Overview

The Audit Black Box Service provides a comprehensive audit logging system that:

- **Captures** who/what/when/where for all sensitive actions
- **Stores** records in an append-only, tamper-evident structure
- **Supports** efficient retrieval for ombuds, security, and regulators
- **Complies** with SOC2, GDPR, HIPAA, ISO 27001, FedRAMP, and CJIS requirements

## Features

### Cryptographic Integrity

- **SHA-256 Hash Chain**: Each event links cryptographically to the previous
- **HMAC Signatures**: All entries signed for integrity verification
- **Merkle Tree Checkpoints**: Efficient batch verification at configurable intervals

### Critical Event Categories

- `access` - User access events (login, logout, session management)
- `export` - Data export events (bulk downloads, reports, API extracts)
- `admin_change` - Administrative changes (user management, config, permissions)
- `policy_change` - Policy changes (RBAC/ABAC rules, OPA policies)
- `model_selection` - AI/ML model selection and execution
- `security` - Security events (breaches, alerts, anomalies)
- `data_lifecycle` - Data lifecycle events (deletion, anonymization, retention)
- `compliance` - Compliance events (audits, reports, attestations)

### RTBF Compliance

- **Tombstone-based Redaction**: Never silently delete history
- **Multi-level Approval**: Configurable approval workflow
- **Audit Trail**: Full audit of redaction operations
- **Grace Period**: Configurable delay before execution

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Services Layer                               │
├───────────┬───────────┬───────────┬───────────┬────────────────┤
│ API       │ Auth      │ Graph     │ Copilot   │ Other Services │
│ Gateway   │ Service   │ API       │ Service   │                │
└─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴────────┬───────┘
      │           │           │           │              │
      └───────────┴───────────┼───────────┴──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Logging Pipeline  │
                    │  (Redis Queue)     │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Event Buffer      │
                    │  (Backpressure)    │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼────────┐ ┌────▼────┐ ┌───────▼───────┐
     │ Immutable Store │ │ API     │ │ Verification  │
     │ (PostgreSQL)    │ │ Server  │ │ Tools         │
     └────────┬────────┘ └─────────┘ └───────────────┘
              │
     ┌────────▼────────┐
     │ Hash Chain +    │
     │ Merkle Tree     │
     └─────────────────┘
```

## Quick Start

### Installation

```bash
cd services/audit-blackbox-service
pnpm install
```

### Configuration

Set environment variables:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=audit_blackbox
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Security
AUDIT_SIGNING_KEY=your-secret-signing-key

# API
API_PORT=4001
API_HOST=0.0.0.0
LOG_LEVEL=info
```

### Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## API Reference

### Ingest Events

```http
POST /audit/events
Content-Type: application/json
X-User-Id: admin-user
X-Tenant-Id: tenant-1
X-User-Roles: admin

{
  "eventType": "user_login",
  "level": "info",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-1",
  "serviceId": "api-gateway",
  "serviceName": "API Gateway",
  "environment": "production",
  "action": "login",
  "outcome": "success",
  "message": "User logged in successfully",
  "userId": "user-123"
}
```

### Search Events

```http
GET /audit/events?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z&eventTypes=user_login,user_logout&limit=100
X-User-Id: admin-user
X-Tenant-Id: tenant-1
X-User-Roles: admin
```

### Export Report

```http
POST /audit/export
Content-Type: application/json
X-User-Id: admin-user
X-Tenant-Id: tenant-1
X-User-Roles: admin

{
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-31T23:59:59Z",
  "format": "json",
  "eventTypes": ["user_login", "data_export"],
  "includeDetails": true
}
```

### Verify Integrity

```http
GET /audit/integrity?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z
X-User-Id: admin-user
X-Tenant-Id: tenant-1
X-User-Roles: admin
```

### Request Redaction (RTBF)

```http
POST /audit/redact
Content-Type: application/json
X-User-Id: admin-user
X-Tenant-Id: tenant-1
X-User-Roles: admin,privacy_officer

{
  "subjectUserId": "user-to-redact",
  "reason": "GDPR Article 17 request",
  "legalBasis": "data_subject_request",
  "fieldsToRedact": ["userId", "userName", "userEmail", "ipAddress"]
}
```

## Integration Guide

### Using the Logging Pipeline

Services should use the logging pipeline for sending audit events:

```typescript
import { createAuditSink, createServiceAdapter } from '@summit/logging-pipeline';

// Create sink connection
const sink = await createAuditSink({
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

// Create service adapter
const audit = createServiceAdapter({
  serviceId: 'my-service',
  serviceName: 'My Service',
  environment: 'production',
  tenantId: 'default',
  sink,
});

// Log events
await audit.logAccess({
  userId: 'user-123',
  action: 'login',
  outcome: 'success',
  ipAddress: '192.168.1.1',
});

await audit.logExport({
  userId: 'user-123',
  resourceType: 'investigation',
  exportFormat: 'csv',
  recordCount: 1000,
  outcome: 'success',
});

await audit.logSecurity({
  eventType: 'alert',
  severity: 'high',
  description: 'Suspicious activity detected',
});
```

### Event Schema

All events must include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventType` | string | Yes | Type of event |
| `level` | string | Yes | debug/info/warn/error/critical |
| `correlationId` | UUID | Yes | Cross-service correlation |
| `tenantId` | string | Yes | Multi-tenant isolation |
| `serviceId` | string | Yes | Source service ID |
| `serviceName` | string | Yes | Source service name |
| `environment` | string | Yes | development/staging/production |
| `action` | string | Yes | Action performed |
| `outcome` | string | Yes | success/failure/partial/pending/denied |
| `message` | string | Yes | Human-readable description |

## Security Considerations

1. **Signing Key**: Use a strong, unique signing key in production
2. **Access Control**: Implement proper RBAC for audit API access
3. **Encryption**: Enable TLS for all connections
4. **Retention**: Configure retention policies per compliance requirements
5. **Backups**: Regular encrypted backups of audit data

## Compliance Requirements

### SOC 2

- All access events logged
- Change management tracked
- Security events captured

### GDPR

- Right to be Forgotten (RTBF) support
- Data export capability
- Consent tracking

### HIPAA

- PHI access logging
- Authentication events
- Disclosure tracking

### ISO 27001

- Security event logging
- Access control auditing
- Change management

## Troubleshooting

### Events Not Being Stored

1. Check database connectivity
2. Verify signing key configuration
3. Check buffer status: `GET /audit/health`

### Integrity Verification Fails

1. Check for database corruption
2. Verify signing key hasn't changed
3. Look for sequence gaps

### High Latency

1. Increase buffer batch size
2. Check database indexes
3. Consider partitioning by time

## License

MIT
