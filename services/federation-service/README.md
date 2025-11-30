# Federation Service

Cross-organization intelligence exchange and federation service for IntelGraph.

## Overview

The Federation Service enables **policy-bound sharing** of intelligence data (entities, cases, alerts, IOCs) between different organizations or tenants while preserving:

- **Provenance**: Complete chain-of-custody tracking
- **Policy Enforcement**: Deny-by-default sharing rules
- **Redaction**: Field-level data transformation
- **Audit Trail**: Comprehensive logging of all operations

## Features

### Sharing Models

1. **PUSH**: Source organization actively shares objects with target
2. **PULL**: Target organization queries available objects from source
3. **SUBSCRIPTION**: Real-time delivery of objects matching criteria

### Security & Compliance

- ✅ **Policy-based access control** via SharingAgreements
- ✅ **Redaction engine** with multiple transformation types
- ✅ **Digital signatures** for message integrity (JWT/RSA)
- ✅ **Mutual TLS** support
- ✅ **Audit logging** for all federation operations
- ✅ **Provenance tracking** with chain verification

### Interoperability

- ✅ **JSON-over-HTTPS** baseline protocol
- ✅ **STIX 2.1 / TAXII 2.1** mappings for standards compliance

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Federation Service                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Policy     │  │  Redaction   │  │  Provenance  │  │
│  │  Evaluator   │  │    Engine    │  │   Tracker    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Federation Manager                        │  │
│  │  (Push / Pull / Subscription)                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Transport   │  │  STIX/TAXII  │  │    Audit     │  │
│  │   (HTTPS)    │  │    Mapper    │  │   Logger     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
cd services/federation-service
pnpm install
```

### Development

```bash
# Start dev server
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### API Server

The service exposes a REST API on port `4100`:

```bash
# Start server
pnpm start

# Health check
curl http://localhost:4100/health
```

## API Reference

### Create Sharing Agreement

```http
POST /api/v1/agreements
Content-Type: application/json

{
  "name": "Alert Sharing Agreement",
  "sourcePartnerId": "org-a-uuid",
  "targetPartnerId": "org-b-uuid",
  "sharingMode": "PUSH",
  "policyConstraints": {
    "maxClassificationLevel": "SECRET",
    "allowedJurisdictions": ["US", "FVEY"],
    "allowedObjectTypes": ["ALERT", "IOC"],
    "redactionRules": [
      {
        "field": "internalCaseId",
        "action": "remove"
      }
    ],
    "licenseType": "TLP:AMBER",
    "allowDownstreamSharing": false
  }
}
```

### Push Share

```http
POST /api/v1/share/push
Content-Type: application/json

{
  "agreementId": "agreement-uuid",
  "sharedBy": "analyst-id",
  "objects": [
    {
      "id": "alert-1",
      "type": "ALERT",
      "classification": "CONFIDENTIAL",
      "jurisdiction": "US",
      "data": {
        "title": "Suspicious Activity",
        "severity": "HIGH"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Pull Query

```http
GET /api/v1/share/pull?agreementId=agreement-uuid&objectTypes=IOC&limit=100
```

### Query Audit Logs

```http
GET /api/v1/audit?agreementId=agreement-uuid&startDate=2024-01-01
```

## Core Concepts

### SharingAgreement

Formal agreement between two partners defining:

- **Parties**: Source and target organizations
- **Policy Constraints**: Classification, jurisdiction, object types
- **Redaction Rules**: Field-level transformations
- **License Terms**: TLP markings, downstream sharing
- **Sharing Mode**: PUSH, PULL, or SUBSCRIPTION

### Redaction Rules

Supported actions:

- **redact**: Replace with `[REDACTED]` or custom text
- **pseudonymize**: Consistent hashing (e.g., "Person ABC12345")
- **hash**: One-way SHA-256 hash
- **remove**: Delete field entirely

### Provenance Chain

Each shared object maintains a provenance chain:

1. Object selection
2. Policy evaluation
3. Redaction applied
4. Share transmitted

Chain integrity verified via linked entries.

## Configuration

### Environment Variables

```bash
PORT=4100
NODE_ENV=production

# Key management (for signing)
FEDERATION_PRIVATE_KEY=/path/to/private.pem
FEDERATION_PUBLIC_KEY=/path/to/public.pem

# mTLS (optional)
MTLS_CERT=/path/to/cert.pem
MTLS_KEY=/path/to/key.pem
MTLS_CA=/path/to/ca.pem
```

## Security Considerations

### Deny by Default

- Nothing is shared unless explicitly allowed by an ACTIVE agreement
- All operations require policy evaluation
- Failed policy checks are audited

### Audit Requirements

Every federation operation generates an audit log entry with:

- Timestamp
- Operation type
- Agreement ID
- User/partner context
- Success/failure
- Provenance links

### Redaction Validation

Before sharing, the system validates:

1. All required redaction rules applied
2. No sensitive fields exposed
3. Classification constraints met
4. Provenance chain complete

## Testing

### Unit Tests

```bash
pnpm test:unit
```

Tests cover:
- Policy evaluation logic
- Redaction transformations
- Provenance chain integrity
- Agreement validation

### Integration Tests

```bash
pnpm test:integration
```

Tests cover:
- End-to-end PUSH sharing
- PULL query filtering
- Cross-tenant scenarios
- Redaction correctness

### Coverage

```bash
pnpm test -- --coverage
```

Target: **70%** minimum coverage

## STIX/TAXII Support

### Convert to STIX Bundle

```typescript
import { stixTaxiiMapper } from './protocols/stix-taxii.js';

const bundle = stixTaxiiMapper.toStixBundle(sharePackage);
// Returns STIX 2.1 Bundle with proper TLP markings
```

### Convert from STIX

```typescript
const sharedObject = stixTaxiiMapper.fromStix(stixIndicator);
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["node", "dist/server.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: federation-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: federation-service
  template:
    metadata:
      labels:
        app: federation-service
    spec:
      containers:
      - name: federation-service
        image: intelgraph/federation-service:latest
        ports:
        - containerPort: 4100
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "4100"
```

## Roadmap

- [ ] PostgreSQL persistence layer
- [ ] Redis caching for agreements
- [ ] Kafka integration for subscriptions
- [ ] Advanced OPA policy integration
- [ ] GraphQL federation API
- [ ] Blockchain provenance anchoring

## Contributing

1. Follow CLAUDE.md conventions
2. Write tests for new features
3. Ensure `pnpm lint` and `pnpm typecheck` pass
4. Add audit logging for new operations
5. Update this README

## License

Proprietary - IntelGraph Platform

---

**Maintainer**: Federation Team
**Last Updated**: 2024-11-29
