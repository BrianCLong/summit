# IntelGraph CTI Module

STIX 2.1 Bundle Export and TAXII 2.1 Server Implementation for IntelGraph Platform.

## Overview

This module provides comprehensive Cyber Threat Intelligence (CTI) interoperability capabilities:

- **STIX 2.1 Bundle Export**: Convert IntelGraph entities to STIX 2.1 format
- **TAXII 2.1 Server**: Standards-compliant threat intelligence sharing
- **Secure Sharing**: Cryptographic signing for air-gapped environments
- **RBAC-Gated APIs**: Fine-grained access control for CTI operations

## Features

### STIX 2.1 Support

- Full SDO (STIX Domain Objects) mapping:
  - Attack Pattern, Campaign, Course of Action
  - Identity, Indicator, Infrastructure
  - Intrusion Set, Location, Malware
  - Note, Observed Data, Report
  - Threat Actor, Tool, Vulnerability

- SRO (STIX Relationship Objects):
  - Relationships with standard vocabulary
  - Sightings

- TLP Markings:
  - TLP:CLEAR, TLP:WHITE, TLP:GREEN
  - TLP:AMBER, TLP:AMBER+STRICT, TLP:RED

### TAXII 2.1 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/taxii2/` | GET | Discovery document |
| `/taxii2/api/` | GET | API root information |
| `/taxii2/api/collections` | GET | List collections |
| `/taxii2/api/collections/:id` | GET | Get collection |
| `/taxii2/api/collections/:id/objects` | GET | Get objects |
| `/taxii2/api/collections/:id/objects` | POST | Add objects |
| `/taxii2/api/collections/:id/manifest` | GET | Get manifest |
| `/taxii2/api/status/:id` | GET | Get operation status |

### CTI Export Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cti/export` | POST | Export entities to STIX bundle |
| `/cti/export/airgap` | POST | Export signed bundle for air-gap transfer |
| `/cti/verify` | POST | Verify signed bundle/package |
| `/cti/sync` | POST | Sync entities to TAXII collection |
| `/cti/health` | GET | Service health check |
| `/cti/info` | GET | Service information |

## Usage

### Export Entities to STIX Bundle

```typescript
POST /cti/export
Content-Type: application/json

{
  "entityIds": ["uuid-1", "uuid-2", "uuid-3"],
  "includeRelationships": true,
  "relationshipDepth": 2,
  "tlpLevel": "amber",
  "includeExtensions": true,
  "producerName": "My Organization",
  "labels": ["investigation-123"],
  "sign": true
}
```

Response:
```json
{
  "bundle": {
    "type": "bundle",
    "id": "bundle--<uuid>",
    "objects": [...]
  },
  "metadata": {
    "exportedAt": "2025-01-01T00:00:00.000Z",
    "exportedBy": "user-id",
    "entityCount": 3,
    "relationshipCount": 5,
    "tlpLevel": "amber",
    "signature": "<base64url>",
    "signatureAlgorithm": "HMAC-SHA256",
    "checksum": "<sha256>"
  }
}
```

### Export for Air-Gapped Environments

```typescript
POST /cti/export/airgap
Content-Type: application/json

{
  "entityIds": ["uuid-1", "uuid-2"],
  "tlpLevel": "red"
}
```

Returns a signed air-gap package that can be verified offline.

### Verify Signed Bundle

```typescript
POST /cti/verify
Content-Type: application/json

{
  "bundle": {...},
  "signature": {...}
}
```

Response:
```json
{
  "type": "signed-bundle",
  "valid": true,
  "errors": [],
  "metadata": {...},
  "verifiedAt": "2025-01-01T00:00:00.000Z"
}
```

## RBAC Permissions

| Permission | Description |
|------------|-------------|
| `cti:read` | Read TAXII collections and objects |
| `cti:write` | Add objects to collections |
| `cti:export` | Export entities to STIX bundles |
| `cti:share` | Create air-gap packages |
| `cti:admin` | Full CTI administration |

## Configuration

### Environment Variables

```bash
# TAXII Server
TAXII_BASE_URL=http://localhost:4000
TAXII_TITLE=IntelGraph TAXII Server

# Signing (required for air-gap export)
STIX_SIGNING_KEY=<base64url-encoded-key>
STIX_SIGNING_KEY_ID=key-001
STIX_SIGNING_ALGORITHM=HMAC-SHA256  # or HMAC-SHA384, HMAC-SHA512
```

### Generate Signing Key

```typescript
import { generateSigningKey } from './intel/cti';

const key = generateSigningKey(32); // 32 bytes = 256 bits
console.log(key);
```

## Entity Type Mapping

| IntelGraph Kind | STIX Type |
|-----------------|-----------|
| person | identity (individual) |
| organization | identity (organization) |
| threat-actor | threat-actor |
| campaign | campaign |
| attack-pattern | attack-pattern |
| indicator | indicator |
| malware | malware |
| tool | tool |
| vulnerability | vulnerability |
| infrastructure | infrastructure |
| asset | infrastructure |
| intrusion-set | intrusion-set |
| location | location |
| report | report |
| case | report |
| note | note |
| document | note |
| claim | note |
| event | observed-data |

## IntelGraph Extension

Exported objects include an IntelGraph extension for traceability:

```json
{
  "extensions": {
    "extension-definition--a932fcc6-e032-176c-126f-cb970a5a1fff": {
      "extension_type": "property-extension",
      "intelgraph_entity_id": "uuid",
      "intelgraph_tenant_id": "tenant-id",
      "intelgraph_investigation_id": "inv-id",
      "intelgraph_case_id": "case-id",
      "intelgraph_provenance_id": "prov-id",
      "intelgraph_confidence_score": 85,
      "intelgraph_classification": "TLP:AMBER",
      "intelgraph_source_system": "intelgraph"
    }
  }
}
```

## Testing

```bash
# Run unit tests
pnpm test server/src/intel/cti

# Run E2E tests
pnpm test server/src/intel/cti/__tests__/taxii-e2e.test.ts
```

## References

- [STIX 2.1 Specification](https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html)
- [TAXII 2.1 Specification](https://docs.oasis-open.org/cti/taxii/v2.1/taxii-v2.1.html)
- [TLP 2.0 Standard](https://www.first.org/tlp/)
