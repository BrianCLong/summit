# Provenance & Claim Ledger Beta - Implementation Guide

## Overview

The Provenance & Claim Ledger Beta implementation fulfills the Wishbooks requirement:

> **"Every assertion carries source → transform chain, hashes, confidence, and licenses; exports ship with verifiable manifests."**

This implementation provides:
- Complete source tracking with cryptographic hashing
- Full transform chain recording with input/output verification
- Evidence registration with license tracking
- Claim extraction and registration with confidence scores
- Verifiable export manifests using Merkle trees
- Digital signatures for tamper detection
- Offline verification capabilities

## Architecture

### Core Components

1. **Data Models** (`server/src/types/provenance-beta.ts`)
   - `Source`: Original data sources with hashing and custody chains
   - `Transform`: Data transformations with algorithm versioning
   - `Evidence`: Registered evidence with transform chains
   - `Claim`: Extracted claims with confidence and licenses
   - `License`: License tracking with restrictions
   - `ExportManifest`: Signed manifests with Merkle trees

2. **Service Layer** (`server/src/services/provenance-ledger-beta.ts`)
   - `ProvenanceLedgerBetaService`: Unified service for all operations
   - License management (create, retrieve)
   - Source registration
   - Transform tracking
   - Evidence registration
   - Claim registration and querying
   - Provenance chain retrieval
   - Export manifest creation
   - Manifest verification

3. **Evidence Registration Flow** (`server/src/services/evidence-registration-flow.ts`)
   - Complete document ingestion pipeline
   - Automatic transform chain creation
   - Claim extraction from text
   - Full provenance tracking

4. **Merkle Tree Utilities** (`server/src/utils/merkle-tree.ts`)
   - Deterministic Merkle tree construction
   - Proof generation and verification
   - Tamper detection

5. **REST API** (`server/src/routes/provenance-beta.ts`)
   - RESTful endpoints for all operations
   - Document ingestion endpoint
   - Health checks

6. **Database Schema** (`server/db/migrations/postgres/2025-11-20_provenance_ledger_beta.sql`)
   - TimescaleDB tables for temporal data
   - Immutable append-only logs
   - Foreign key integrity

7. **Neo4j Graph Schema** (`server/db/migrations/neo4j/003_provenance_beta_constraints.cypher`)
   - Graph nodes and relationships
   - Provenance chain visualization
   - Contradiction tracking

## Getting Started

### Prerequisites

- PostgreSQL/TimescaleDB
- Neo4j (optional for graph features)
- Node.js 18+
- TypeScript

### Database Setup

1. **Run PostgreSQL migration:**

```bash
psql -U postgres -d summit_db -f server/db/migrations/postgres/2025-11-20_provenance_ledger_beta.sql
```

2. **Run Neo4j migration (optional):**

```bash
cypher-shell -u neo4j -p password -f server/db/migrations/neo4j/003_provenance_beta_constraints.cypher
```

3. **Verify tables:**

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('sources', 'transforms', 'licenses', 'merkle_trees', 'manifest_items');
```

### Environment Variables

```bash
# .env
LEDGER_SIGNING_KEY=your-secret-signing-key-here  # For HMAC signatures
DATABASE_URL=postgresql://user:pass@localhost:5432/summit_db
NEO4J_URL=bolt://localhost:7687  # Optional
```

### Running the Service

```typescript
import express from 'express';
import provenanceRoutes from './routes/provenance-beta';

const app = express();
app.use(express.json());
app.use('/api/provenance-beta', provenanceRoutes);

app.listen(3000, () => {
  console.log('Provenance Ledger Beta running on port 3000');
});
```

## Usage Examples

### 1. Create a License

```typescript
POST /api/provenance-beta/licenses

{
  "license_type": "internal",
  "license_terms": "Internal Use Only",
  "restrictions": ["no-external-sharing"],
  "attribution_required": true
}

// Response
{
  "success": true,
  "data": {
    "id": "license-xxxxx",
    "license_type": "internal",
    ...
  }
}
```

### 2. Ingest a Document (Complete Flow)

```typescript
POST /api/provenance-beta/ingest

{
  "documentPath": "/path/to/report.txt",
  "documentContent": "The organization has 500 employees...",
  "userId": "user-123",
  "investigationId": "investigation-456",
  "licenseId": "license-xxxxx",
  "metadata": {
    "format": "text",
    "author": "Analyst"
  }
}

// Response
{
  "success": true,
  "data": {
    "source": { ... },
    "transforms": [ ... ],
    "evidence": [ ... ],
    "claims": [ ... ],
    "provenance_summary": {
      "source_hash": "abc123...",
      "transform_count": 3,
      "evidence_count": 1,
      "claim_count": 5,
      "total_duration_ms": 150
    }
  }
}
```

### 3. Query Claims

```typescript
GET /api/provenance-beta/claims?investigation_id=investigation-456&confidence_min=0.8

// Response
{
  "success": true,
  "data": [
    {
      "id": "claim-xxxxx",
      "content": "The organization has 500 employees",
      "claim_type": "factual",
      "confidence": 0.85,
      "evidence_ids": ["evidence-xxxxx"],
      "source_id": "source-xxxxx",
      "transform_chain": ["transform-1", "transform-2", "transform-3"],
      ...
    }
  ],
  "count": 5
}
```

### 4. Get Provenance Chain

```typescript
GET /api/provenance-beta/chain/claim-xxxxx

// Response
{
  "success": true,
  "data": {
    "item_id": "claim-xxxxx",
    "item_type": "claim",
    "claim": { ... },
    "source": {
      "id": "source-xxxxx",
      "source_hash": "abc123...",
      "source_type": "document",
      ...
    },
    "transforms": [
      {
        "id": "transform-1",
        "transform_type": "extract",
        "input_hash": "abc123...",
        "output_hash": "def456...",
        "algorithm": "text-extractor",
        "version": "1.0.0",
        ...
      },
      ...
    ],
    "evidence": [ ... ],
    "licenses": [ ... ],
    "custody_chain": ["user-123", "system"]
  }
}
```

### 5. Create Export Manifest

```typescript
POST /api/provenance-beta/export

{
  "investigation_id": "investigation-456",
  "export_type": "investigation_bundle",
  "classification_level": "INTERNAL",
  "created_by": "user-123",
  "authority_basis": ["warrant-123"]
}

// Response
{
  "success": true,
  "data": {
    "manifest_id": "manifest-xxxxx",
    "bundle_id": "bundle-xxxxx",
    "merkle_root": "abc123def456...",
    "hash_algorithm": "SHA-256",
    "items": [
      {
        "id": "claim-xxxxx",
        "item_type": "claim",
        "content_hash": "hash1...",
        "merkle_proof": ["proof1", "proof2", ...],
        "source_id": "source-xxxxx",
        "transform_chain": [...],
        "license_id": "license-xxxxx"
      },
      ...
    ],
    "signature": "signature_hash...",
    "licenses": [ ... ],
    "created_at": "2025-11-20T..."
  }
}
```

### 6. Verify Export Manifest

```typescript
GET /api/provenance-beta/export/manifest-xxxxx/verify

// Response
{
  "success": true,
  "data": {
    "manifest_id": "manifest-xxxxx",
    "bundle_valid": true,
    "signature_valid": true,
    "merkle_valid": true,
    "item_verifications": [
      {
        "item_id": "claim-xxxxx",
        "item_type": "claim",
        "valid": true
      },
      ...
    ],
    "chain_verifications": [ ... ],
    "license_issues": [],
    "verified_at": "2025-11-20T..."
  }
}
```

## Running Tests

```bash
# Run end-to-end tests
npm test -- provenance-ledger-beta.e2e.test.ts

# Run with verbose output
npm test -- provenance-ledger-beta.e2e.test.ts --verbose

# Expected output:
# ✅ Document ingested successfully
# ✅ Transform chains verified
# ✅ Provenance chains complete
# ✅ Export manifest created
# ✅ Merkle proofs valid
# ✅ Signature valid
# ✅ All assertions carry: source → transform chain, hashes, confidence, licenses
# ✅ Export ships with: verifiable Merkle manifest, digital signatures
```

## Data Flow Diagram

```
┌─────────────┐
│  Document   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  1. Source Registration                         │
│  - Compute SHA256 hash                          │
│  - Record origin, metadata, license             │
│  - Create custody chain                         │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  2. Transform: Extract Text                     │
│  - Input hash: source_hash                      │
│  - Output hash: extracted_text_hash             │
│  - Algorithm: text-extractor v1.0.0             │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  3. Transform: Normalize Text                   │
│  - Input hash: extracted_text_hash              │
│  - Output hash: normalized_text_hash            │
│  - Algorithm: text-normalizer v1.0.0            │
│  - Parent: [extract_transform_id]               │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  4. Evidence Registration                       │
│  - Evidence hash: normalized_text_hash          │
│  - Source reference                             │
│  - Transform chain: [extract, normalize]        │
│  - License tracking                             │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  5. Claim Extraction (for each claim)           │
│  - Transform: Extract Claim                     │
│  - Input hash: normalized_text_hash             │
│  - Output hash: claim_text_hash                 │
│  - Algorithm: nlp-claim-extractor v2.0.0        │
│  - Parent: [normalize_transform_id]             │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  6. Claim Registration                          │
│  - Claim content + content_hash                 │
│  - Claim type (factual/inferential/etc.)        │
│  - Confidence score                             │
│  - Evidence references                          │
│  - Source reference                             │
│  - Transform chain: [extract, normalize, claim] │
│  - License inheritance                          │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  7. Export Manifest Creation                    │
│  - Gather all items (claims, evidence, sources) │
│  - Build Merkle tree                            │
│  - Generate proofs for each item                │
│  - Aggregate licenses                           │
│  - Create chain of custody                      │
│  - Sign manifest (HMAC-SHA256)                  │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  8. Verification (Offline or Online)            │
│  - Verify signature                             │
│  - Verify Merkle root                           │
│  - Verify each item's Merkle proof              │
│  - Verify transform chain integrity             │
│  - Check license conflicts                      │
│  - Generate verification report                 │
└─────────────────────────────────────────────────┘
```

## Key Features

### ✅ Complete Provenance Tracking
- Every claim traces back to original source
- Full transform chain recorded
- Custody chain maintained
- Immutable audit log

### ✅ Cryptographic Integrity
- SHA256 content hashing
- HMAC signatures
- Merkle tree verification
- Tamper detection

### ✅ License Management
- Per-item license tracking
- License aggregation in exports
- Restriction enforcement
- Conflict detection

### ✅ Verifiable Exports
- Merkle root for bundle integrity
- Individual proofs per item
- Digital signatures
- Offline verification

### ✅ Transform Chain Validation
- Input/output hash verification
- Parent-child linking
- Algorithm versioning
- Confidence tracking

## Database Schema Highlights

### Sources Table
```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  source_hash TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  origin_url TEXT,
  ingestion_timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  license_id TEXT REFERENCES licenses(id),
  custody_chain TEXT[],
  ...
);
```

### Transforms Table
```sql
CREATE TABLE transforms (
  id TEXT PRIMARY KEY,
  transform_type TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  version TEXT NOT NULL,
  parameters JSONB,
  parent_transforms TEXT[],
  confidence NUMERIC(5,4),
  ...
);
```

### Claims Registry (Enhanced)
```sql
ALTER TABLE claims_registry
  ADD COLUMN source_id TEXT REFERENCES sources(id),
  ADD COLUMN claim_type TEXT,
  ADD COLUMN transform_chain TEXT[],
  ADD COLUMN license_id TEXT REFERENCES licenses(id),
  ADD COLUMN contradicts TEXT[],
  ADD COLUMN corroborates TEXT[];
```

## Neo4j Graph Relationships

```cypher
// Provenance relationships
(Claim)-[:DERIVED_FROM]->(Source)
(Claim)-[:TRANSFORMED_BY]->(Transform)
(Claim)-[:SUPPORTED_BY]->(Evidence)
(Claim)-[:HAS_LICENSE]->(License)
(Claim)-[:CONTRADICTS]-(Claim)
(Claim)-[:SUPPORTS]-(Claim)

(Evidence)-[:SOURCED_FROM]->(Source)
(Evidence)-[:TRANSFORMED_BY]->(Transform)

(Transform)-[:FOLLOWS]->(Transform)  // Chain

(Manifest)-[:INCLUDES]->(Claim)
(Manifest)-[:INCLUDES]->(Evidence)
(Manifest)-[:INCLUDES]->(Source)
```

## Performance Considerations

- **Indexes**: All hash columns, timestamps, and foreign keys indexed
- **Batching**: Bulk transform/claim registration supported
- **Caching**: Consider Redis for frequently accessed manifests
- **Pagination**: Limit query results to 1000 items by default
- **Merkle Trees**: Cached after creation for verification

## Security Considerations

- **HMAC Signing**: All manifests signed with secret key
- **Tamper Detection**: Merkle proofs detect any modification
- **Immutability**: Append-only logs prevent history rewriting
- **License Enforcement**: Check restrictions before exports
- **Custody Tracking**: Full chain of actors recorded

## Future Enhancements

1. **Ed25519 Signatures**: Upgrade to public-key cryptography
2. **Blockchain Anchoring**: Anchor Merkle roots to public blockchain
3. **Automated Contradiction Detection**: ML-based claim comparison
4. **SLSA Provenance**: Full SLSA Level 3 compliance
5. **Zero-Knowledge Proofs**: Selective disclosure
6. **GraphQL API**: Alternative to REST
7. **Visualization UI**: Interactive provenance exploration

## Troubleshooting

### Verification Fails

```typescript
// Check manifest signature
const report = await provenanceLedger.verifyManifest(manifestId);

if (!report.signature_valid) {
  console.error('Signature mismatch - manifest may be tampered');
}

if (!report.merkle_valid) {
  console.error('Merkle root mismatch - items modified');
}

// Check individual items
report.item_verifications.forEach(v => {
  if (!v.valid) {
    console.error(`Item ${v.item_id} failed verification: ${v.error}`);
  }
});
```

### Transform Chain Broken

```sql
-- Find broken transform chains
SELECT * FROM claims_registry c
WHERE EXISTS (
  SELECT 1 FROM unnest(c.transform_chain) AS tc(tid)
  WHERE NOT EXISTS (SELECT 1 FROM transforms WHERE id = tc.tid)
);
```

### Missing Provenance

```sql
-- Check provenance chain coverage
SELECT
  c.id,
  c.content,
  COALESCE(array_length(c.transform_chain, 1), 0) as transform_count,
  s.source_hash
FROM claims_registry c
LEFT JOIN sources s ON c.source_id = s.id
WHERE s.id IS NULL OR array_length(c.transform_chain, 1) = 0;
```

## API Reference

See full API documentation: `/docs/api/provenance-beta.md`

## Conclusion

The Provenance & Claim Ledger Beta implementation provides:

✅ **Complete source tracking** with cryptographic hashing
✅ **Full transform chains** with algorithm versioning
✅ **Evidence registration** with license tracking
✅ **Claim extraction** with confidence scores
✅ **Verifiable exports** with Merkle trees and digital signatures
✅ **Offline verification** capabilities
✅ **Immutable audit logs** for compliance

**Every assertion now carries its complete provenance, and exports ship with verifiable manifests.**

For questions or support, see: `/docs/architecture/prov-ledger.md`
