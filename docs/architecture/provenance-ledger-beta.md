# Provenance & Claim Ledger - Beta Architecture

## Executive Summary

This document describes the advancement of the Provenance & Claim Ledger service to **beta**, fulfilling the Wishbooks requirement: *"every assertion carries source → transform chain, hashes, confidence, and licenses; exports ship with verifiable manifests."*

## Current State Analysis

### Existing Infrastructure

The codebase has substantial provenance infrastructure across multiple implementations:

#### 1. **Node.js/TypeScript Implementation**
- **Location**: `server/src/services/provenance-ledger.ts`
- **Responsibilities**:
  - Immutable provenance chain recording (ProvenanceChain)
  - Claim registration with content hashing (ClaimRecord)
  - Export manifest creation with transformation chains (ExportManifest)
  - Disclosure bundle generation with immutable seals (DisclosureBundle)
  - Chain of custody tracking
  - Provenance chain verification

#### 2. **Python/FastAPI Implementation**
- **Location**: `prov_ledger/app/`
- **Responsibilities**:
  - Claim extraction from natural language (`nlp/extractor.py`)
  - Evidence registration (`evidence.py`, `evidence_registry.py`)
  - Provenance graph tracking with NetworkX (`provenance.py`)
  - Merkle tree manifest builder (`manifest/manifest_builder.py`)
  - Export utilities (`exporters/prov_json.py`, `export_manifest.py`)
  - Ethics and security checks (`ethics.py`, `security.py`)
  - Scoring and corroboration (`scoring.py`)

#### 3. **Database Schema**

**TimescaleDB Tables**:
- `provenance_chain` - Immutable audit trail with SHA256 hashing, HMAC signatures
- `claims_registry` - Claims with content hash, confidence, evidence references
- `export_manifests` - Manifests with transformation chains and chain of custody
- `disclosure_bundles` - Sealed bundles with aggregated claims and evidence
- `evidence_bundles` - Evidence artifacts with SBOM and provenance
- `evidence_artifacts` - Individual artifacts with SHA256, retention policies
- `evidence_provenance` - Provenance chain links between artifacts
- `audit_events` - Immutable audit events log

**Neo4j Graph Schema**:
- `Claim` nodes - Unique ID and content_hash constraints
- `Evidence` nodes - Unique sha256 constraints
- `License` nodes - License type tracking
- `Authority` nodes - Authority binding and clearance levels
- `Provenance` nodes - Chain integrity with hash constraints
- Indexes on timestamps, statuses, clearance levels

#### 4. **Export & Verification**
- Merkle tree construction and proof generation
- Digital signatures (SHA256, HMAC, Ed25519 planned)
- Export manifest schema (JSON Schema spec)
- CLI verification tools (`prov-verify`)
- Deterministic export service

### Current Gaps for Beta

1. **Fragmented Implementation**: Python and Node.js implementations operate independently
2. **Missing Source Model**: No explicit `Source` data model to track document origins
3. **Transform Chain Incomplete**: Transform chains exist but lack detailed metadata (timing, parameters, versioning)
4. **License Integration**: Licenses tracked but not fully integrated into every claim/evidence flow
5. **Offline Verification**: Export manifests exist but offline verification tooling is basic
6. **Graph Integration**: Neo4j constraints exist but claim-evidence graph linking needs strengthening

---

## Beta Design

### Architecture Principles

1. **Unified Service Boundary**: Consolidate TypeScript implementation as primary, use Python for NLP/ML tasks
2. **Immutability First**: All records are append-only with cryptographic verification
3. **Graph-Native**: Claims, Evidence, Sources, and Transforms as first-class Neo4j nodes
4. **Verifiable Exports**: Every export includes Merkle tree, signatures, and offline verification instructions

### Service Boundary

```
┌─────────────────────────────────────────────────────────────┐
│           Provenance & Claim Ledger Service                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Source     │  │  Transform   │  │   Evidence   │      │
│  │  Management  │  │    Chain     │  │ Registration │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │     Claim      │                        │
│                    │  Registration  │                        │
│                    └───────┬────────┘                        │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼───────┐  ┌──────▼────────┐  ┌──────▼───────┐    │
│  │  Provenance  │  │     Hash      │  │   License    │    │
│  │     Chain    │  │     Tree      │  │   Tracking   │    │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘    │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │     Export     │                        │
│                    │    Manifest    │                        │
│                    │   + Merkle     │                        │
│                    └────────────────┘                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Core Data Models

#### Source
```typescript
interface Source {
  id: string;                    // UUID
  source_hash: string;           // SHA256 of original content
  source_type: 'document' | 'database' | 'api' | 'user_input' | 'sensor';
  origin_url?: string;           // Original location
  ingestion_timestamp: Date;
  metadata: {
    format?: string;             // PDF, CSV, JSON, etc.
    size_bytes?: number;
    encoding?: string;
    author?: string;
    created_date?: Date;
  };
  license: License;              // Associated license
  custody_chain: string[];       // Actor IDs who handled this source
  retention_policy: string;
  created_by: string;            // Actor ID
}
```

#### Transform
```typescript
interface Transform {
  id: string;                    // UUID
  transform_type: string;        // 'ocr', 'translate', 'extract', 'normalize', 'enrich'
  input_hash: string;            // SHA256 of input
  output_hash: string;           // SHA256 of output
  algorithm: string;             // Specific algorithm/model used
  version: string;               // Algorithm version
  parameters: Record<string, any>; // Transform parameters
  execution_timestamp: Date;
  duration_ms: number;
  executed_by: string;           // Actor ID or system component
  confidence?: number;           // Confidence in transformation (0-1)
  parent_transforms: string[];   // Previous transform IDs in chain
}
```

#### Evidence
```typescript
interface Evidence {
  id: string;                    // UUID
  evidence_hash: string;         // SHA256 of evidence content
  evidence_type: 'document' | 'image' | 'video' | 'log' | 'testimony' | 'sensor_data';
  content_preview?: string;      // First N chars or description
  storage_uri: string;           // S3/WORM storage location
  source_id: string;             // Reference to Source
  transform_chain: string[];     // Array of Transform IDs
  license: License;
  classification_level: string;
  collected_at: Date;
  registered_by: string;         // Actor ID
  metadata: Record<string, any>;
}
```

#### Claim
```typescript
interface Claim {
  id: string;                    // UUID
  content_hash: string;          // SHA256 of claim content
  content: string;               // The assertion/claim text
  claim_type: 'factual' | 'inferential' | 'predictive' | 'evaluative';
  confidence: number;            // 0-1
  evidence_ids: string[];        // References to Evidence
  source_id: string;             // Primary Source reference
  transform_chain: string[];     // Transforms applied to derive claim
  extracted_at: Date;
  created_by: string;            // Actor ID or extraction system
  investigation_id?: string;
  license: License;              // Inherited or specific
  contradicts: string[];         // Other claim IDs this contradicts
  corroborates: string[];        // Other claim IDs this supports
}
```

#### License
```typescript
interface License {
  id: string;
  license_type: 'public' | 'internal' | 'restricted' | 'classified';
  license_terms?: string;        // CC-BY-4.0, proprietary, etc.
  restrictions: string[];        // Usage restrictions
  attribution_required: boolean;
  expiration_date?: Date;
}
```

#### ExportManifest (Enhanced)
```typescript
interface ExportManifest {
  manifest_id: string;
  manifest_version: string;      // Semantic version
  created_at: Date;
  created_by: string;
  bundle_id: string;
  merkle_root: string;           // Root hash of Merkle tree
  hash_algorithm: 'SHA-256' | 'SHA3-256';

  items: ManifestItem[];

  // Chain of custody
  custody_chain: ChainOfCustodyEntry[];

  // Export metadata
  export_type: string;
  classification_level: string;
  retention_policy: string;

  // Verification
  signature: string;             // Digital signature of manifest
  public_key_id: string;         // Key used for signing

  // License aggregation
  licenses: License[];           // All licenses in bundle
  license_conflicts?: string[];  // Any conflicting license requirements
}

interface ManifestItem {
  id: string;
  item_type: 'claim' | 'evidence' | 'source' | 'transform';
  content_hash: string;
  merkle_proof: string[];        // Path to merkle_root
  source_id?: string;
  transform_chain: string[];
  license_id: string;
  metadata: Record<string, any>;
}
```

---

## Implementation Plan

### Phase 1: Enhanced Data Models & Schema

**New Database Tables** (TimescaleDB):

```sql
-- Sources table
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  source_hash TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  origin_url TEXT,
  ingestion_timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  license_id TEXT REFERENCES licenses(id),
  custody_chain TEXT[] NOT NULL DEFAULT '{}',
  retention_policy TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sources_hash_idx ON sources(source_hash);
CREATE INDEX sources_type_idx ON sources(source_type);
CREATE INDEX sources_ingestion_idx ON sources(ingestion_timestamp DESC);

-- Transforms table
CREATE TABLE transforms (
  id TEXT PRIMARY KEY,
  transform_type TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  version TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_timestamp TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  executed_by TEXT NOT NULL,
  confidence NUMERIC(5,4),
  parent_transforms TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX transforms_input_hash_idx ON transforms(input_hash);
CREATE INDEX transforms_output_hash_idx ON transforms(output_hash);
CREATE INDEX transforms_type_idx ON transforms(transform_type);
CREATE INDEX transforms_execution_idx ON transforms(execution_timestamp DESC);

-- Licenses table (enhanced)
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  license_type TEXT NOT NULL,
  license_terms TEXT,
  restrictions TEXT[] NOT NULL DEFAULT '{}',
  attribution_required BOOLEAN NOT NULL DEFAULT true,
  expiration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX licenses_type_idx ON licenses(license_type);

-- Evidence table (enhanced with source and transform references)
ALTER TABLE evidence_artifacts ADD COLUMN IF NOT EXISTS source_id TEXT REFERENCES sources(id);
ALTER TABLE evidence_artifacts ADD COLUMN IF NOT EXISTS transform_chain TEXT[] DEFAULT '{}';
ALTER TABLE evidence_artifacts ADD COLUMN IF NOT EXISTS license_id TEXT REFERENCES licenses(id);

-- Claims table (enhanced)
ALTER TABLE claims_registry ADD COLUMN IF NOT EXISTS source_id TEXT REFERENCES sources(id);
ALTER TABLE claims_registry ADD COLUMN IF NOT EXISTS claim_type TEXT DEFAULT 'factual';
ALTER TABLE claims_registry ADD COLUMN IF NOT EXISTS transform_chain TEXT[] DEFAULT '{}';
ALTER TABLE claims_registry ADD COLUMN IF NOT EXISTS license_id TEXT REFERENCES licenses(id);
ALTER TABLE claims_registry ADD COLUMN IF NOT EXISTS contradicts TEXT[] DEFAULT '{}';
ALTER TABLE claims_registry ADD COLUMN IF NOT EXISTS corroborates TEXT[] DEFAULT '{}';

-- Merkle tree nodes (for export verification)
CREATE TABLE merkle_trees (
  id TEXT PRIMARY KEY,
  manifest_id TEXT NOT NULL,
  root_hash TEXT NOT NULL,
  tree_data JSONB NOT NULL, -- Full tree structure
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX merkle_trees_manifest_idx ON merkle_trees(manifest_id);
CREATE INDEX merkle_trees_root_hash_idx ON merkle_trees(root_hash);
```

**Neo4j Schema Extensions**:

```cypher
// Source node
CREATE CONSTRAINT source_id IF NOT EXISTS FOR (s:Source) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT source_hash IF NOT EXISTS FOR (s:Source) REQUIRE s.source_hash IS UNIQUE;
CREATE INDEX source_type_idx IF NOT EXISTS FOR (s:Source) ON (s.source_type);

// Transform node
CREATE CONSTRAINT transform_id IF NOT EXISTS FOR (t:Transform) REQUIRE t.id IS UNIQUE;
CREATE INDEX transform_type_idx IF NOT EXISTS FOR (t:Transform) ON (t.transform_type);
CREATE INDEX transform_timestamp_idx IF NOT EXISTS FOR (t:Transform) ON (t.execution_timestamp);

// Enhanced relationships
// Claim -[:DERIVED_FROM]-> Source
// Claim -[:TRANSFORMED_BY]-> Transform
// Claim -[:SUPPORTS]-> Claim (corroboration)
// Claim -[:CONTRADICTS]-> Claim
// Evidence -[:SOURCED_FROM]-> Source
// Evidence -[:TRANSFORMED_BY]-> Transform
// Transform -[:FOLLOWS]-> Transform (chain)
```

### Phase 2: Service Implementation

**Unified ProvenanceLedgerService** (`server/src/services/provenance-ledger-beta.ts`):

Core methods:
- `registerSource(sourceData)` → Source
- `registerTransform(transformData)` → Transform
- `registerEvidence(evidenceData, sourceId, transformChain)` → Evidence
- `registerClaim(claimData, evidenceIds, sourceId, transformChain)` → Claim
- `buildMerkleTree(items)` → MerkleTree
- `createExportManifest(bundleData)` → ExportManifest
- `signManifest(manifest, privateKey)` → SignedManifest
- `verifyManifest(manifest, publicKey)` → boolean
- `verifyMerkleProof(item, proof, root)` → boolean

### Phase 3: Evidence Registration Flow

**Ingest Flow**: Document → Source → Transforms → Evidence → Claims → Graph

```typescript
// Example flow
async function ingestDocument(
  documentPath: string,
  userId: string,
  investigationId: string
): Promise<{ claims: Claim[]; evidence: Evidence[] }> {

  // 1. Register source
  const sourceHash = await computeFileHash(documentPath);
  const source = await provenanceLedger.registerSource({
    source_type: 'document',
    source_hash: sourceHash,
    origin_url: documentPath,
    metadata: {
      format: 'PDF',
      size_bytes: await getFileSize(documentPath)
    },
    license: await detectLicense(documentPath),
    created_by: userId
  });

  // 2. Extract text (Transform 1)
  const extractedText = await extractTextFromPDF(documentPath);
  const extractTransform = await provenanceLedger.registerTransform({
    transform_type: 'extract',
    input_hash: sourceHash,
    output_hash: computeHash(extractedText),
    algorithm: 'pdf-extract',
    version: '1.0.0',
    parameters: { method: 'pdfplumber' },
    executed_by: 'system'
  });

  // 3. Normalize text (Transform 2)
  const normalizedText = normalizeText(extractedText);
  const normalizeTransform = await provenanceLedger.registerTransform({
    transform_type: 'normalize',
    input_hash: computeHash(extractedText),
    output_hash: computeHash(normalizedText),
    algorithm: 'text-normalize',
    version: '1.0.0',
    parameters: { lowercase: true, remove_stopwords: true },
    executed_by: 'system',
    parent_transforms: [extractTransform.id]
  });

  // 4. Register evidence
  const evidence = await provenanceLedger.registerEvidence({
    evidence_type: 'document',
    content_preview: normalizedText.substring(0, 500),
    storage_uri: `s3://evidence-bucket/${sourceHash}`,
    source_id: source.id,
    transform_chain: [extractTransform.id, normalizeTransform.id],
    license: source.license,
    registered_by: userId
  });

  // 5. Extract claims (Transform 3)
  const extractedClaims = await extractClaims(normalizedText);
  const claims: Claim[] = [];

  for (const claimText of extractedClaims) {
    const claimTransform = await provenanceLedger.registerTransform({
      transform_type: 'extract_claim',
      input_hash: computeHash(normalizedText),
      output_hash: computeHash(claimText),
      algorithm: 'nlp-claim-extractor',
      version: '2.0.0',
      parameters: { model: 'claim-bert-v2' },
      executed_by: 'system',
      parent_transforms: [normalizeTransform.id]
    });

    const claim = await provenanceLedger.registerClaim({
      content: claimText,
      claim_type: 'factual',
      confidence: 0.85,
      evidence_ids: [evidence.id],
      source_id: source.id,
      transform_chain: [extractTransform.id, normalizeTransform.id, claimTransform.id],
      created_by: userId,
      investigation_id: investigationId,
      license: source.license
    });

    claims.push(claim);

    // 6. Create graph relationships
    await createGraphRelationships(claim, evidence, source);
  }

  return { claims, evidence: [evidence] };
}
```

### Phase 4: Export Path with Signed Manifests

```typescript
async function createVerifiableExport(
  investigationId: string,
  userId: string
): Promise<{ manifest: ExportManifest; bundle: Buffer }> {

  // 1. Gather all claims, evidence, sources, transforms
  const claims = await getClaims({ investigation_id: investigationId });
  const evidenceIds = [...new Set(claims.flatMap(c => c.evidence_ids))];
  const evidence = await getEvidence(evidenceIds);
  const sourceIds = [...new Set([
    ...claims.map(c => c.source_id),
    ...evidence.map(e => e.source_id)
  ])];
  const sources = await getSources(sourceIds);
  const transformIds = [...new Set([
    ...claims.flatMap(c => c.transform_chain),
    ...evidence.flatMap(e => e.transform_chain)
  ])];
  const transforms = await getTransforms(transformIds);

  // 2. Build Merkle tree
  const items: ManifestItem[] = [
    ...claims.map(c => ({
      id: c.id,
      item_type: 'claim' as const,
      content_hash: c.content_hash,
      source_id: c.source_id,
      transform_chain: c.transform_chain,
      license_id: c.license.id
    })),
    ...evidence.map(e => ({
      id: e.id,
      item_type: 'evidence' as const,
      content_hash: e.evidence_hash,
      source_id: e.source_id,
      transform_chain: e.transform_chain,
      license_id: e.license.id
    })),
    ...sources.map(s => ({
      id: s.id,
      item_type: 'source' as const,
      content_hash: s.source_hash,
      license_id: s.license.id
    })),
    ...transforms.map(t => ({
      id: t.id,
      item_type: 'transform' as const,
      content_hash: computeHash(JSON.stringify(t))
    }))
  ];

  const merkleTree = buildMerkleTree(items);

  // 3. Add Merkle proofs to items
  items.forEach(item => {
    item.merkle_proof = merkleTree.getProof(item.content_hash);
  });

  // 4. Aggregate licenses
  const licenses = [...new Set([
    ...claims.map(c => c.license),
    ...evidence.map(e => e.license),
    ...sources.map(s => s.license)
  ])];

  // 5. Create manifest
  const manifest: ExportManifest = {
    manifest_id: crypto.randomUUID(),
    manifest_version: '1.0.0',
    created_at: new Date(),
    created_by: userId,
    bundle_id: crypto.randomUUID(),
    merkle_root: merkleTree.root,
    hash_algorithm: 'SHA-256',
    items,
    custody_chain: [{
      actor_id: userId,
      action: 'EXPORT_CREATED',
      timestamp: new Date(),
      signature: '',
      justification: 'Investigation export'
    }],
    export_type: 'investigation_bundle',
    classification_level: 'INTERNAL',
    retention_policy: 'REGULATORY_STANDARD',
    signature: '',
    public_key_id: '',
    licenses
  };

  // 6. Sign manifest
  const privateKey = await getSigningKey(userId);
  const signature = signManifest(manifest, privateKey);
  manifest.signature = signature;
  manifest.public_key_id = await getPublicKeyId(userId);

  // 7. Store Merkle tree
  await storeMerkleTree(manifest.manifest_id, merkleTree);

  // 8. Create bundle tarball
  const bundle = await createBundleTarball({
    manifest,
    claims,
    evidence,
    sources,
    transforms,
    verification_instructions: generateVerificationInstructions(manifest)
  });

  return { manifest, bundle };
}
```

### Phase 5: Offline Verification

**Verification CLI** (`scripts/verify-provenance-bundle.ts`):

```typescript
async function verifyBundle(bundlePath: string): Promise<VerificationReport> {
  // 1. Extract bundle
  const { manifest, claims, evidence, sources } = await extractBundle(bundlePath);

  // 2. Verify manifest signature
  const signatureValid = await verifySignature(
    manifest,
    manifest.signature,
    manifest.public_key_id
  );

  // 3. Verify Merkle root
  const items = [...claims, ...evidence, ...sources];
  const recomputedRoot = buildMerkleTree(items).root;
  const merkleValid = recomputedRoot === manifest.merkle_root;

  // 4. Verify each item's Merkle proof
  const itemVerifications = manifest.items.map(item => {
    const proofValid = verifyMerkleProof(
      item.content_hash,
      item.merkle_proof,
      manifest.merkle_root
    );
    return { item_id: item.id, valid: proofValid };
  });

  // 5. Verify transform chains
  const chainVerifications = claims.map(claim => {
    return verifyTransformChain(claim.transform_chain, sources, transforms);
  });

  // 6. Check license conflicts
  const licenseIssues = checkLicenseCompatibility(manifest.licenses);

  return {
    bundle_valid: signatureValid && merkleValid &&
                  itemVerifications.every(v => v.valid) &&
                  chainVerifications.every(v => v.valid),
    signature_valid: signatureValid,
    merkle_valid: merkleValid,
    item_verifications: itemVerifications,
    chain_verifications: chainVerifications,
    license_issues: licenseIssues,
    verified_at: new Date()
  };
}
```

---

## API Endpoints

### REST API (`server/src/routes/provenance-beta.ts`)

```
POST   /api/provenance/sources              - Register a source
POST   /api/provenance/transforms           - Register a transform
POST   /api/provenance/evidence             - Register evidence
POST   /api/provenance/claims               - Register a claim
GET    /api/provenance/claims/:id           - Get claim with full provenance
POST   /api/provenance/export               - Create export manifest
GET    /api/provenance/export/:id/download  - Download bundle
POST   /api/provenance/verify               - Verify a manifest
GET    /api/provenance/chain/:itemId        - Get full provenance chain
```

### GraphQL Schema Enhancement

```graphql
type Source {
  id: ID!
  sourceHash: String!
  sourceType: SourceType!
  originUrl: String
  metadata: JSON!
  license: License!
  custodyChain: [String!]!
  createdAt: DateTime!
}

type Transform {
  id: ID!
  transformType: String!
  inputHash: String!
  outputHash: String!
  algorithm: String!
  version: String!
  parameters: JSON!
  executionTimestamp: DateTime!
  durationMs: Int!
  confidence: Float
  parentTransforms: [Transform!]!
}

type Evidence {
  id: ID!
  evidenceHash: String!
  evidenceType: EvidenceType!
  source: Source!
  transformChain: [Transform!]!
  license: License!
  registeredBy: String!
}

type Claim {
  id: ID!
  contentHash: String!
  content: String!
  claimType: ClaimType!
  confidence: Float!
  evidence: [Evidence!]!
  source: Source!
  transformChain: [Transform!]!
  license: License!
  contradicts: [Claim!]!
  corroborates: [Claim!]!
}

type ExportManifest {
  manifestId: ID!
  merkleRoot: String!
  items: [ManifestItem!]!
  licenses: [License!]!
  signature: String!
  createdAt: DateTime!
}

type Query {
  provenanceChain(itemId: ID!): ProvenanceChain!
  verifyManifest(manifestId: ID!): VerificationReport!
}

type Mutation {
  registerSource(input: SourceInput!): Source!
  registerTransform(input: TransformInput!): Transform!
  registerEvidence(input: EvidenceInput!): Evidence!
  registerClaim(input: ClaimInput!): Claim!
  createExport(investigationId: ID!): ExportManifest!
}
```

---

## Testing Strategy

### End-to-End Test Scenario

```typescript
describe('Provenance Ledger Beta - End-to-End', () => {
  it('should track full provenance from ingest to verified export', async () => {
    // 1. Ingest document
    const { claims, evidence } = await ingestDocument(
      './test-data/sample-report.pdf',
      'user-123',
      'investigation-456'
    );

    expect(claims).toHaveLength(5);
    expect(evidence).toHaveLength(1);

    // 2. Verify transform chains
    for (const claim of claims) {
      expect(claim.transform_chain.length).toBeGreaterThan(0);
      const chainValid = await verifyTransformChain(claim.transform_chain);
      expect(chainValid).toBe(true);
    }

    // 3. Verify graph relationships
    const claimNode = await neo4j.findNode('Claim', { id: claims[0].id });
    const sourceEdge = await neo4j.findRelationship(claimNode, 'DERIVED_FROM');
    expect(sourceEdge).toBeDefined();

    // 4. Create export
    const { manifest, bundle } = await createVerifiableExport(
      'investigation-456',
      'user-123'
    );

    expect(manifest.merkle_root).toBeDefined();
    expect(manifest.signature).toBeDefined();
    expect(manifest.items.length).toBeGreaterThan(0);

    // 5. Verify export offline
    await fs.writeFile('./test-bundle.tar.gz', bundle);
    const verification = await verifyBundle('./test-bundle.tar.gz');

    expect(verification.bundle_valid).toBe(true);
    expect(verification.signature_valid).toBe(true);
    expect(verification.merkle_valid).toBe(true);
    expect(verification.item_verifications.every(v => v.valid)).toBe(true);

    // 6. Verify licenses
    expect(manifest.licenses.length).toBeGreaterThan(0);
    expect(verification.license_issues).toHaveLength(0);
  });
});
```

---

## Success Criteria for Beta

- [ ] All 4 core data models implemented (Source, Transform, Evidence, Claim)
- [ ] Database schemas deployed (TimescaleDB + Neo4j)
- [ ] Evidence registration flow functional
- [ ] Transform chains tracked with full metadata
- [ ] License tracking integrated into all flows
- [ ] Merkle tree export manifests generated
- [ ] Digital signatures on manifests
- [ ] Offline verification CLI working
- [ ] GraphQL API endpoints functional
- [ ] End-to-end test passing
- [ ] Documentation complete

---

## Future Enhancements (Post-Beta)

1. **Ed25519 Signature Support**: Upgrade from HMAC to proper public-key cryptography
2. **Multi-tenant Key Management**: Separate signing keys per tenant
3. **Contradiction Detection**: Automated claim contradiction detection using embeddings
4. **License Conflict Resolution**: AI-assisted license compatibility checking
5. **Provenance Visualization**: Interactive UI for exploring transform chains
6. **Blockchain Anchoring**: Optional anchoring of Merkle roots to public blockchains
7. **SLSA Provenance Integration**: Full SLSA Level 3 compliance for software artifacts
8. **Zero-Knowledge Proofs**: Selective disclosure without revealing full evidence

---

## Conclusion

This beta design consolidates existing infrastructure, adds missing data models (Source, Transform), strengthens the evidence registration flow with full transform chain tracking, implements Merkle tree-based export manifests with digital signatures, and provides offline verification tooling. Every assertion now carries its complete source → transform chain, hashes, confidence scores, and licenses, fulfilling the Wishbooks requirement.
