# Provenance & Claim Ledger Service

A dedicated microservice for evidence/claim registration, provenance chain tracking, and disclosure bundle generation for IntelGraph.

## Overview

The Prov-Ledger service provides tamper-evident storage and retrieval of:
- **Claims**: Assertions with cryptographic hashes
- **Evidence**: Files and data with checksums and transform chains
- **Provenance Chains**: Append-only transformation history
- **Disclosure Bundles**: Merkle-tree-based verification manifests

## Architecture

- **Framework**: Fastify 5.x (lightweight, high-performance)
- **Database**: PostgreSQL 15+ (relational storage)
- **Validation**: Zod (schema validation)
- **Logging**: Pino (structured JSON logs)
- **Security**: Helmet (security headers), policy-based authorization

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or pnpm

### Installation

```bash
cd services/prov-ledger
npm install
```

### Database Setup

Run migrations to create required tables:

```bash
npm run migrate
```

### Running the Service

Development mode with hot-reload:
```bash
npm run dev
```

Production build and start:
```bash
npm run build
npm start
```

### Environment Variables

```bash
PORT=4010                           # Service port (default: 4010)
NODE_ENV=development                # Environment (development|production)
DATABASE_URL=postgres://...         # PostgreSQL connection string
CORS_ORIGIN=http://localhost:3000   # CORS allowed origin
POLICY_DRY_RUN=false                # Dry-run mode for policy enforcement
```

## API Reference

### Authentication

All requests require policy enforcement headers:
- `x-authority-id`: Identifier for the requesting authority
- `x-reason-for-access`: Justification for the request

### Endpoints

#### Health Check

```http
GET /health
```

Returns service health status and database connectivity.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "version": "1.0.0",
  "dependencies": {
    "database": "healthy"
  }
}
```

---

#### Claims

##### Create Claim

```http
POST /claims
Content-Type: application/json
x-authority-id: authority-001
x-reason-for-access: investigation

{
  "content": {
    "title": "Evidence Analysis",
    "findings": "..."
  },
  "sourceRef": "file://report.pdf",
  "licenseId": "license-001",
  "policyLabels": ["confidential", "investigation"],
  "metadata": {
    "author": "analyst-001"
  }
}
```

**Response:**
```json
{
  "id": "claim_uuid",
  "content": {...},
  "hash": "sha256-hash",
  "sourceRef": "file://report.pdf",
  "licenseId": "license-001",
  "policyLabels": ["confidential", "investigation"],
  "created_at": "2025-01-20T10:00:00.000Z"
}
```

##### Get Claim

```http
GET /claims/:id
```

Returns claim details by ID.

---

#### Evidence

##### Register Evidence

```http
POST /evidence
Content-Type: application/json

{
  "caseId": "case-001",
  "sourceRef": "file://evidence.pdf",
  "checksum": "abc123...",
  "checksumAlgorithm": "sha256",
  "contentType": "application/pdf",
  "fileSize": 1024,
  "transformChain": [
    {
      "transformType": "ocr",
      "timestamp": "2025-01-20T10:00:00.000Z",
      "actorId": "system",
      "config": {"method": "tesseract"}
    }
  ],
  "policyLabels": ["legal", "confidential"],
  "metadata": {}
}
```

**Note**: If `checksum` is not provided, include `content` field and the service will compute it.

**Response:**
```json
{
  "id": "evidence_uuid",
  "caseId": "case-001",
  "sourceRef": "file://evidence.pdf",
  "checksum": "abc123...",
  "checksumAlgorithm": "sha256",
  "transformChain": [...],
  "created_at": "2025-01-20T10:00:00.000Z"
}
```

##### Get Evidence

```http
GET /evidence/:id
```

Returns evidence details including full transform chain.

---

#### Disclosure Bundles

##### Get Bundle for Case

```http
GET /bundles/:caseId
```

Generates a disclosure bundle manifest for all evidence in a case.

**Response:**
```json
{
  "caseId": "case-001",
  "version": "1.0",
  "evidence": [
    {
      "id": "evidence_uuid",
      "sourceRef": "file://doc.pdf",
      "checksum": "abc123...",
      "transformChain": [...]
    }
  ],
  "hashTree": ["hash1", "hash2", "hash3"],
  "merkleRoot": "root-hash",
  "generated_at": "2025-01-20T10:00:00.000Z"
}
```

The `merkleRoot` provides cryptographic proof of all evidence integrity.

---

#### Provenance

##### Create Provenance Chain

```http
POST /provenance
Content-Type: application/json

{
  "claimId": "claim-001",
  "transforms": ["extraction", "analysis"],
  "sources": ["evidence-001", "evidence-002"],
  "lineage": {
    "methodology": "automated analysis"
  }
}
```

##### Get Provenance Chains

```http
GET /provenance?claimId=claim-001
```

Returns all provenance chains for a claim.

---

#### Verification

##### Verify Hash

```http
POST /hash/verify
Content-Type: application/json

{
  "content": {...},
  "expectedHash": "abc123..."
}
```

**Response:**
```json
{
  "valid": true,
  "expected_hash": "abc123...",
  "actual_hash": "abc123...",
  "verified_at": "2025-01-20T10:00:00.000Z"
}
```

---

## Using the Client Library

Other services can use the TypeScript client:

```typescript
import { createProvLedgerClient } from '@server/prov-ledger-client';

const client = createProvLedgerClient({
  baseURL: 'http://localhost:4010',
  authorityId: 'my-service',
  reasonForAccess: 'investigation workflow',
});

// Register evidence
const evidence = await client.createEvidence({
  sourceRef: 'file://document.pdf',
  checksum: 'abc123...',
  policyLabels: ['investigation'],
});

// Generate bundle
const bundle = await client.getDisclosureBundle('case-001');
console.log(`Merkle root: ${bundle.merkleRoot}`);
```

## Testing

Run all tests:
```bash
npm test
```

Run specific test suite:
```bash
npm test -- test/unit/claims.test.ts
```

Run E2E tests:
```bash
npm test -- test/e2e/workflow.test.ts
```

Run with coverage:
```bash
npm test -- --coverage
```

## Data Model

### Core Entities

- **Claim**: Assertion with content, hash, and metadata
- **Evidence**: File/data with checksum and provenance
- **Authority**: Entity authorized to access the system
- **License**: Legal terms for data usage
- **ProvenanceChain**: Append-only transformation history
- **Case**: Container grouping related evidence

### Transform Chain

Each evidence item can have a `transformChain` documenting all transformations:

```typescript
{
  transformType: string;    // e.g., "ocr", "redaction", "enhancement"
  timestamp: string;        // ISO 8601 timestamp
  actorId: string;          // Who/what performed the transform
  config?: object;          // Transform-specific configuration
}
```

Transform chains are **append-only** and provide full lineage tracking.

## Security & Compliance

### Policy Enforcement

All requests must include:
- `x-authority-id`: Identifies the requester
- `x-reason-for-access`: Justification (audit trail)

Violations result in `403 Forbidden` or policy warnings (dry-run mode).

### Cryptographic Integrity

- All claims have SHA-256 content hashes
- Evidence uses checksums (SHA-256 default, configurable)
- Bundles use Merkle trees for tamper-evidence
- Hashes are deterministic and reproducible

### Audit Trail

All operations log:
- Authority ID
- Reason for access
- Timestamps
- Resource IDs

### Data Protection

- Helmet middleware for security headers
- CORS configuration
- No breaking changes to existing services
- Client library isolates implementation details

## Error Handling

### Error Codes

- `400 Bad Request`: Invalid input (validation failed)
- `403 Forbidden`: Policy violation
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Duplicate resource (e.g., checksum collision)
- `500 Internal Server Error`: Service error
- `503 Service Unavailable`: Database unavailable

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "appealPath": "/ombudsman/appeals"
}
```

## Development

### Project Structure

```
services/prov-ledger/
├── src/
│   ├── index.ts              # Main service entry point
│   └── scripts/
│       └── migrate.ts        # Database migrations
├── test/
│   ├── unit/                 # Unit tests
│   │   ├── claims.test.ts
│   │   ├── evidence.test.ts
│   │   └── bundles.test.ts
│   └── e2e/                  # End-to-end tests
│       └── workflow.test.ts
├── Dockerfile                # Container build
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

### Code Style

- **TypeScript**: Strict typing preferred
- **Formatting**: Prettier (via ESLint)
- **Linting**: ESLint with TypeScript rules
- **Testing**: Jest with ts-jest

### Contributing

1. Write tests for new features
2. Ensure 100% test pass rate
3. Follow existing code patterns
4. Document public APIs
5. No breaking changes to existing services

## Monitoring

### Logs

Structured JSON logs via Pino:

```json
{
  "level": 30,
  "time": 1234567890,
  "msg": "Created claim",
  "claimId": "claim_uuid",
  "hash": "abc123...",
  "authority": "authority-001"
}
```

### Metrics

- Request latency
- Database query performance
- Error rates by endpoint
- Policy violation counts (dry-run mode)

## License

Proprietary - IntelGraph

## Support

For issues, questions, or feature requests:
- GitHub Issues: [Repository Link]
- Internal Slack: #intelgraph-prov-ledger
- Documentation: https://docs.intelgraph.com/prov-ledger
