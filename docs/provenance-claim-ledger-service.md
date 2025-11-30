# Provenance & Claim Ledger Service

> **Chain-of-Custody Core for Intelligence Graph Platform**

## Overview

The Provenance & Claim Ledger Service is the authoritative chain-of-custody and evidence tracking layer for the Summit/IntelGraph platform. It provides:

- **Evidence Registration**: Cryptographically verifiable evidence ingestion
- **Claim Management**: Structured claim tracking with confidence scoring
- **Transform Tracking**: Complete audit trail of data transformations
- **Export Manifests**: Verifiable disclosure packages with Merkle tree integrity
- **Audit Logging**: Immutable, hash-chained audit log with tamper detection

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Provenance Ledger Service                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐ │
│  │  Source   │  │ Transform │  │ Evidence  │  │    Claim     │ │
│  │ Registry  │─▶│  Tracker  │─▶│ Registry  │─▶│  Management  │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────────┘ │
│                                        │              │          │
│                                        └──────┬───────┘          │
│                                               │                  │
│                           ┌──────────────────────────────────┐  │
│                           │ Claim-Evidence Link Management  │  │
│                           │   (SUPPORTS / CONTRADICTS)       │  │
│                           └──────────────────────────────────┘  │
│                                       │                          │
│                           ┌──────────────────────────────────┐  │
│                           │   Export Manifest Generator      │  │
│                           │   (Merkle Tree Verification)     │  │
│                           └──────────────────────────────────┘  │
│                                       │                          │
│                           ┌──────────────────────────────────┐  │
│                           │    Immutable Audit Log           │  │
│                           │    (Hash-Chained Records)        │  │
│                           └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model

#### Evidence

Represents raw source material ingested into the system.

```typescript
interface Evidence {
  id: string;                    // UUID
  evidence_hash: string;         // SHA-256 checksum
  evidence_type: EvidenceType;   // document | image | video | log | etc.
  storage_uri: string;           // S3 URI or storage location
  source_id: string;             // Reference to source
  transform_chain: string[];     // Ordered list of transform IDs
  license_id: string;            // License governing usage
  classification_level: string;  // INTERNAL | CONFIDENTIAL | etc.
  collected_at: Date;
  registered_by: string;         // User or service ID
}
```

#### Claim

Represents an assertion or finding derived from evidence.

```typescript
interface Claim {
  id: string;                    // UUID
  content_hash: string;          // Hash of claim content
  content: string;               // Human-readable claim text
  claim_type: ClaimType;         // factual | inferential | predictive | evaluative
  confidence: number;            // 0.0 to 1.0
  evidence_ids: string[];        // Evidence supporting this claim
  source_id: string;             // Original source
  transform_chain: string[];     // Transforms applied to derive claim
  created_by: string;            // User or service ID
  investigation_id?: string;     // Optional investigation context
  license_id: string;
  created_at: Date;
}
```

#### Transform

Represents a data transformation or extraction operation.

```typescript
interface Transform {
  id: string;
  transform_type: TransformType; // extract | ocr | translate | normalize | etc.
  input_hash: string;            // Hash of input data
  output_hash: string;           // Hash of output data
  algorithm: string;             // Algorithm/model used
  version: string;               // Version of algorithm
  parameters: Record<string, any>; // Configuration used
  executed_by: string;
  confidence?: number;           // Optional confidence score
  parent_transforms: string[];   // Parent transforms in chain
  created_at: Date;
}
```

#### ClaimEvidenceLink

Represents the relationship between a claim and supporting/contradicting evidence.

```typescript
type ClaimEvidenceRelationType = 'SUPPORTS' | 'CONTRADICTS';

interface ClaimEvidenceLink {
  id: string;
  claim_id: string;
  evidence_id: string;
  relation_type: ClaimEvidenceRelationType;
  confidence?: number;           // Optional confidence in the relationship
  created_by: string;
  created_at: Date;
  notes?: string;                // Optional justification
}
```

## API Endpoints

### License Management

```http
POST /api/provenance-beta/licenses
GET  /api/provenance-beta/licenses/:id
```

### Source Management

```http
POST /api/provenance-beta/sources
GET  /api/provenance-beta/sources/:id
```

### Transform Management

```http
POST /api/provenance-beta/transforms
GET  /api/provenance-beta/transforms/:id
```

### Evidence Management

```http
POST /api/provenance-beta/evidence
GET  /api/provenance-beta/evidence/:id
```

### Claim Management

```http
POST /api/provenance-beta/claims
GET  /api/provenance-beta/claims/:id?include_provenance=true
GET  /api/provenance-beta/claims?investigation_id=X&confidence_min=0.8
```

### Claim-Evidence Link Management

#### Link Evidence to Claim

```http
POST /api/provenance-beta/claims/:claimId/evidence
Content-Type: application/json

{
  "evidence_id": "evidence-123",
  "relation_type": "SUPPORTS",  // or "CONTRADICTS"
  "confidence": 0.95,
  "created_by": "user-456",
  "notes": "This evidence directly supports the claim"
}
```

#### Get Evidence for Claim

```http
GET /api/provenance-beta/claims/:claimId/evidence

Response:
{
  "success": true,
  "data": [
    {
      "id": "link-789",
      "claim_id": "claim-123",
      "evidence_id": "evidence-456",
      "relation_type": "SUPPORTS",
      "confidence": 0.95,
      "created_by": "user-789",
      "created_at": "2025-01-15T10:30:00Z",
      "notes": "Direct support"
    }
  ],
  "count": 1
}
```

#### Get Claims for Evidence

```http
GET /api/provenance-beta/evidence/:evidenceId/claims
```

### Provenance Chain

```http
GET /api/provenance-beta/chain/:itemId
```

### Export Manifest

```http
POST /api/provenance-beta/export
Content-Type: application/json

{
  "claim_ids": ["claim-1", "claim-2"],
  "export_type": "INVESTIGATION_PACKAGE",
  "classification_level": "INTERNAL",
  "created_by": "user-123",
  "authority_basis": ["warrant-456"]
}

Response:
{
  "success": true,
  "data": {
    "manifest_id": "manifest-789",
    "merkle_root": "abc123...",
    "items": [...],
    "custody_chain": [...],
    "signature": "def456..."
  }
}
```

### Manifest Verification

```http
GET /api/provenance-beta/export/:manifestId/verify

Response:
{
  "success": true,
  "data": {
    "manifest_id": "manifest-789",
    "bundle_valid": true,
    "signature_valid": true,
    "merkle_valid": true,
    "item_verifications": [...]
  }
}
```

### Audit Chain Verification

```http
POST /api/provenance-beta/audit/verify
Content-Type: application/json

{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "limit": 1000
}

Response:
{
  "success": true,
  "data": {
    "valid": true,
    "totalRecords": 542,
    "verifiedRecords": 542,
    "errors": []
  }
}
```

## Verification CLI Tool

### Installation

The CLI tool is located at `server/src/bin/provenance-verify.ts`.

### Usage

```bash
# Basic verification
node server/src/bin/provenance-verify.ts export-manifest.json

# With evidence file verification
node server/src/bin/provenance-verify.ts export-manifest.json --evidence-dir ./evidence

# Help
node server/src/bin/provenance-verify.ts --help
```

### Verification Process

The CLI tool performs the following checks:

1. **Manifest Structure**: Validates required fields
2. **Merkle Root**: Recomputes and verifies the Merkle root
3. **Item Proofs**: Verifies each item's Merkle proof
4. **Evidence Files**: (Optional) Verifies file hashes against manifest
5. **License Conflicts**: Checks for licensing issues

### Exit Codes

- `0`: Verification passed
- `1`: Verification failed or error occurred

### Example Output

```
Provenance Manifest Verification Tool
=====================================

✓ Manifest loaded: manifest-abc123
  Items: 15
  Created: 2025-01-15T10:30:00Z
  Merkle Root: 4f2a7b3c...

✓ Merkle root verified
✓ Verified 15/15 item proofs

Checking evidence files in: ./evidence
✓ Checked 5 evidence files

Verification Summary
===================
Overall Result: ✓ PASS
Manifest Valid: ✓
Merkle Root Valid: ✓
All Items Valid: ✓
Evidence Files: 5/5 valid
```

## Immutable Audit Log

### Hash Chaining

Every operation is recorded in an immutable audit log with hash chaining:

```
Record 1:
  content_hash = SHA256(operation_1 + timestamp_1 + prev_hash: null)

Record 2:
  content_hash = SHA256(operation_2 + timestamp_2 + prev_hash: content_hash_1)

Record 3:
  content_hash = SHA256(operation_3 + timestamp_3 + prev_hash: content_hash_2)
```

### Tamper Detection

The service provides `verifyAuditChain()` to detect tampering:

```typescript
const result = await provenanceLedger.verifyAuditChain({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  limit: 1000
});

if (!result.valid) {
  console.error('Audit chain integrity compromised!');
  console.error('Broken at record:', result.brokenAt);
  console.error('Errors:', result.errors);
}
```

## Export Manifest Format

### Manifest Structure

```json
{
  "manifest_id": "manifest-abc123",
  "manifest_version": "1.0.0",
  "created_at": "2025-01-15T10:30:00Z",
  "created_by": "user-456",
  "bundle_id": "bundle-def789",
  "merkle_root": "4f2a7b3c1e5d6a9f...",
  "hash_algorithm": "SHA-256",
  "items": [
    {
      "id": "claim-123",
      "item_type": "claim",
      "content_hash": "abc123...",
      "merkle_proof": ["proof1", "proof2"],
      "source_id": "source-456",
      "transform_chain": ["transform-789"],
      "license_id": "license-012"
    }
  ],
  "custody_chain": [
    {
      "actor_id": "user-456",
      "action": "EXPORT_CREATED",
      "timestamp": "2025-01-15T10:30:00Z",
      "signature": "sig123...",
      "justification": "Export for investigation"
    }
  ],
  "export_type": "INVESTIGATION_PACKAGE",
  "classification_level": "INTERNAL",
  "retention_policy": "REGULATORY_STANDARD",
  "signature": "manifest_signature...",
  "public_key_id": "default-key",
  "licenses": [...],
  "data_sources": ["source-456"],
  "transformation_chain": ["transform-789"],
  "authority_basis": ["warrant-012"]
}
```

### Merkle Tree Construction

The Merkle tree is built from item content hashes:

```
                    Root Hash
                   /         \
              H(AB)            H(CD)
             /     \          /     \
          H(A)    H(B)     H(C)    H(D)
           |       |        |       |
        Item 1  Item 2  Item 3  Item 4
```

Each item includes its Merkle proof (path from leaf to root).

## Usage Examples

### 1. Register Evidence

```typescript
const evidence = await provenanceLedger.registerEvidence({
  evidence_hash: 'abc123...', // SHA-256 of file
  evidence_type: 'document',
  storage_uri: 's3://bucket/evidence.pdf',
  source_id: 'source-456',
  transform_chain: [],
  license_id: 'license-789',
  registered_by: 'user-123'
});
```

### 2. Create Claim from Evidence

```typescript
const claim = await provenanceLedger.registerClaim({
  content: 'Transaction detected on 2025-01-15',
  claim_type: 'factual',
  confidence: 0.92,
  evidence_ids: [evidence.id],
  source_id: 'source-456',
  transform_chain: ['transform-ocr', 'transform-ner'],
  created_by: 'system-ml-pipeline',
  investigation_id: 'inv-123',
  license_id: 'license-789'
});
```

### 3. Link Evidence to Claim

```typescript
// Evidence supports the claim
const supportLink = await provenanceLedger.linkClaimToEvidence({
  claim_id: claim.id,
  evidence_id: evidence.id,
  relation_type: 'SUPPORTS',
  confidence: 0.95,
  created_by: 'analyst-456',
  notes: 'Direct evidence from bank statement'
});

// Another piece of evidence contradicts
const contradictLink = await provenanceLedger.linkClaimToEvidence({
  claim_id: claim.id,
  evidence_id: 'evidence-other',
  relation_type: 'CONTRADICTS',
  confidence: 0.80,
  created_by: 'analyst-456',
  notes: 'Witness testimony conflicts with claim'
});
```

### 4. Query Claims with Evidence Links

```typescript
const claims = await provenanceLedger.queryClaims({
  investigation_id: 'inv-123',
  confidence_min: 0.8
});

for (const claim of claims) {
  const links = await provenanceLedger.getClaimEvidenceLinks(claim.id);

  const supporting = links.filter(l => l.relation_type === 'SUPPORTS');
  const contradicting = links.filter(l => l.relation_type === 'CONTRADICTS');

  console.log(`Claim: ${claim.content}`);
  console.log(`  Supporting evidence: ${supporting.length}`);
  console.log(`  Contradicting evidence: ${contradicting.length}`);
}
```

### 5. Create and Verify Export Manifest

```typescript
// Create manifest
const manifest = await provenanceLedger.createExportManifest({
  claim_ids: ['claim-1', 'claim-2'],
  export_type: 'DISCLOSURE',
  classification_level: 'INTERNAL',
  created_by: 'analyst-123',
  authority_basis: ['legal-request-456']
});

// Verify manifest integrity
const verification = await provenanceLedger.verifyManifest(manifest.manifest_id);

if (verification.bundle_valid) {
  console.log('Manifest integrity verified');
} else {
  console.error('Manifest verification failed:', verification);
}
```

### 6. Verify Audit Chain Integrity

```typescript
const auditVerification = await provenanceLedger.verifyAuditChain({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31')
});

if (auditVerification.valid) {
  console.log(`✓ Audit chain verified: ${auditVerification.verifiedRecords} records`);
} else {
  console.error(`✗ Audit chain broken at: ${auditVerification.brokenAt}`);
  console.error('Errors:', auditVerification.errors);
}
```

## Security Considerations

### 1. Hash Algorithms

- **SHA-256** is used for all content hashing
- Hashes are computed deterministically (sorted JSON keys)
- Change to SHA-3 can be configured via `hash_algorithm` field

### 2. Signatures

- HMAC-SHA256 signatures using configurable signing key
- Set `LEDGER_SIGNING_KEY` environment variable in production
- Future: Support for asymmetric signatures (RSA, ECDSA)

### 3. Access Control

- All operations record `created_by` / `registered_by` actor IDs
- Integrate with existing RBAC/ABAC via middleware
- Audit log captures all access and modifications

### 4. Data Classification

- Evidence and claims support `classification_level`
- Export manifests inherit highest classification of included items
- Redaction tracking via `redactionMap` field

### 5. License Compliance

- All items must reference a license
- License conflicts detected during export
- Attribution requirements enforced

## Database Schema

### Tables

```sql
-- Sources
CREATE TABLE sources (
  id VARCHAR PRIMARY KEY,
  source_hash VARCHAR NOT NULL,
  source_type VARCHAR NOT NULL,
  origin_url VARCHAR,
  ingestion_timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  license_id VARCHAR NOT NULL,
  custody_chain VARCHAR[] NOT NULL,
  retention_policy VARCHAR,
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

-- Evidence
CREATE TABLE evidence_artifacts (
  id VARCHAR PRIMARY KEY,
  sha256 VARCHAR NOT NULL,
  artifact_type VARCHAR NOT NULL,
  storage_uri VARCHAR NOT NULL,
  source_id VARCHAR NOT NULL REFERENCES sources(id),
  transform_chain VARCHAR[] NOT NULL,
  license_id VARCHAR NOT NULL,
  classification_level VARCHAR NOT NULL DEFAULT 'INTERNAL',
  content_preview TEXT,
  registered_by VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

-- Claims
CREATE TABLE claims_registry (
  id VARCHAR PRIMARY KEY,
  content_hash VARCHAR NOT NULL,
  content TEXT NOT NULL,
  claim_type VARCHAR NOT NULL,
  confidence FLOAT NOT NULL,
  evidence_hashes JSONB NOT NULL,
  source_id VARCHAR NOT NULL REFERENCES sources(id),
  transform_chain VARCHAR[] NOT NULL,
  license_id VARCHAR NOT NULL,
  created_by VARCHAR NOT NULL,
  investigation_id VARCHAR,
  contradicts VARCHAR[],
  corroborates VARCHAR[],
  extracted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

-- Claim-Evidence Links
CREATE TABLE claim_evidence_links (
  id VARCHAR PRIMARY KEY,
  claim_id VARCHAR NOT NULL REFERENCES claims_registry(id),
  evidence_id VARCHAR NOT NULL REFERENCES evidence_artifacts(id),
  relation_type VARCHAR NOT NULL CHECK (relation_type IN ('SUPPORTS', 'CONTRADICTS')),
  confidence FLOAT,
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  UNIQUE(claim_id, evidence_id, relation_type)
);

-- Provenance Chain (Audit Log)
CREATE TABLE provenance_chain (
  id VARCHAR PRIMARY KEY,
  parent_hash VARCHAR,  -- Hash of previous record (for chaining)
  content_hash VARCHAR NOT NULL,
  operation_type VARCHAR NOT NULL,
  actor_id VARCHAR NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL,
  signature VARCHAR NOT NULL
);

-- Create indices for performance
CREATE INDEX idx_claims_investigation ON claims_registry(investigation_id);
CREATE INDEX idx_claims_confidence ON claims_registry(confidence);
CREATE INDEX idx_claim_evidence_links_claim ON claim_evidence_links(claim_id);
CREATE INDEX idx_claim_evidence_links_evidence ON claim_evidence_links(evidence_id);
CREATE INDEX idx_provenance_chain_timestamp ON provenance_chain(timestamp DESC);
CREATE INDEX idx_provenance_chain_actor ON provenance_chain(actor_id);
```

## Integration Guide

### Registering New Evidence

When ingesting new data, follow this flow:

1. **Register Source**: Record original data source
2. **Apply Transforms**: Track each transformation step
3. **Register Evidence**: Create evidence record with transform chain
4. **Extract Claims**: Derive claims from evidence
5. **Link Evidence to Claims**: Create explicit support/contradiction links

### Generating Disclosure Packages

For legal or compliance disclosures:

1. **Query Claims**: Get relevant claims by investigation or criteria
2. **Create Export Manifest**: Generate manifest with Merkle tree
3. **Verify Manifest**: Ensure integrity before export
4. **Distribute**: Provide manifest JSON + CLI tool to recipient
5. **Recipient Verification**: Recipient uses CLI to verify integrity

## Troubleshooting

### Audit Chain Verification Fails

**Symptom**: `verifyAuditChain()` returns `valid: false`

**Causes**:
- Database tampering or corruption
- Concurrent writes without proper locking
- System clock issues causing timestamp problems

**Resolution**:
1. Review `brokenAt` and `errors` in verification result
2. Check database logs for unauthorized access
3. Restore from backup if tampering detected

### Manifest Verification Fails

**Symptom**: `verifyManifest()` returns `bundle_valid: false`

**Causes**:
- Manifest file modified after creation
- Merkle tree corruption
- Missing or modified items

**Resolution**:
1. Check `item_verifications` for specific failures
2. Regenerate manifest from source data
3. Use CLI tool for detailed verification

### Performance Issues

**Symptom**: Slow export manifest creation

**Causes**:
- Large number of items in manifest
- Complex transform chains
- Database query performance

**Optimization**:
1. Use database connection pooling
2. Batch item fetching
3. Implement caching for frequently accessed items
4. Consider partitioning large manifests

## References

- [Merkle Trees](https://en.wikipedia.org/wiki/Merkle_tree)
- [Chain of Custody](https://en.wikipedia.org/wiki/Chain_of_custody)
- [SHA-256](https://en.wikipedia.org/wiki/SHA-2)
- [HMAC](https://en.wikipedia.org/wiki/HMAC)

## Support

For issues or questions:
- File an issue in the repository
- Contact the platform team
- Review existing documentation in `docs/`

---

**Version**: 1.0.0
**Last Updated**: 2025-01-22
**Maintained By**: Summit/IntelGraph Engineering Team
