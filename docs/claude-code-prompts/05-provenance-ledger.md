# Prompt 5: Provenance Ledger + Export Signing

## Role
Reliability/Integrity Engineer

## Context
IntelGraph operates in high-stakes environments requiring:
- **Immutable audit trails** for all data operations
- **Chain-of-custody** for evidence and intelligence
- **Air-gap/offline resynchronization** capabilities
- **Tamper-evident exports** for sharing with external parties

The provenance ledger ensures data integrity and enables forensic analysis.

## Task
Implement a provenance ledger system with signed export capabilities:

### 1. Provenance Ledger Module
- Append-only log of all data operations
- Hash-chained records for tamper detection
- Cryptographic signatures on ledger entries
- Query API for provenance retrieval

### 2. Signed Export Bundles
- Export manifest with SHA-256 Merkle tree
- Timestamp and signer identity
- Offline verification CLI
- Support for air-gapped environments

## Guardrails

### Security
- **No PII in manifests** - only hashes and metadata
- **Strong cryptographic signatures** - RSA 2048+ or Ed25519
- **Tamper detection** - any modification breaks verification

### Compliance
- Immutable once written (append-only)
- Provenance records retained per retention policy
- Audit trail for all provenance queries

## Deliverables

### 1. Provenance Ledger Library
- [ ] `libs/provenance/` package with:
  - [ ] Ledger storage interface (pluggable backends)
  - [ ] In-memory implementation (for testing)
  - [ ] PostgreSQL implementation (for production)
  - [ ] Hash-chain logic (SHA-256)
  - [ ] Signature generation and verification
  - [ ] Query API (by entity ID, time range, operation type)

### 2. CLI Tool
- [ ] `provenance` CLI with commands:
  - [ ] `export` - Create signed export bundle
  - [ ] `verify` - Verify bundle integrity and signature
  - [ ] `query` - Query ledger for provenance records
  - [ ] `validate-chain` - Validate hash chain integrity

### 3. Export Bundle Format
- [ ] Manifest specification (YAML/JSON schema)
- [ ] Bundle structure documentation
- [ ] Example bundles for reference

### 4. Testing
- [ ] Unit tests for hash-chain logic
- [ ] Tamper detection tests (modify bundle, verify fails)
- [ ] Round-trip tests (export → verify → pass)
- [ ] Performance tests for ledger queries

### 5. Documentation
- [ ] Provenance ledger design doc
- [ ] Export bundle specification
- [ ] CLI usage guide
- [ ] Integration guide for services

## Acceptance Criteria
- ✅ Tamper test fails verification (modified bundle detected)
- ✅ Round-trip export/verify passes
- ✅ Hash chain validates correctly
- ✅ Signatures verify with correct public key
- ✅ Evidence bundles recorded in CI artifacts
- ✅ No PII exposed in manifests

## Ledger Entry Schema

```typescript
interface LedgerEntry {
  // Entry identification
  entryId: string;            // UUID v4
  sequenceNumber: bigint;     // Monotonic counter

  // Hash chain
  previousHash: string;       // SHA-256 of previous entry
  currentHash: string;        // SHA-256 of this entry

  // Operation details
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS';
  entityId: string;           // Entity affected
  entityType: string;         // Entity type

  // Metadata
  timestamp: string;          // ISO 8601
  actor: string;              // User or service performing operation
  purpose: string;            // Purpose tag or investigation ID

  // Signature
  signature?: string;         // Optional cryptographic signature
  signatureAlgorithm?: 'RSA-SHA256' | 'Ed25519';

  // Additional context
  metadata: Record<string, unknown>;
}
```

## Export Manifest Schema

```yaml
# export-manifest.yaml
version: "1.0"
bundleId: "bundle-2024-01-15-abc123"
createdAt: "2024-01-15T10:30:00Z"

signer:
  identity: "intelgraph-export-service"
  publicKeyFingerprint: "SHA256:abc123..."
  algorithm: "RSA-SHA256"

signature: "base64-encoded-signature"

merkleRoot: "sha256-root-hash"

contents:
  - id: "entity-001"
    type: "Person"
    contentHash: "sha256:..."
    size: 1024

  - id: "entity-002"
    type: "Organization"
    contentHash: "sha256:..."
    size: 2048

metadata:
  purpose: "investigation-456"
  classification: "CONFIDENTIAL"
  exportedBy: "analyst-alice"
  totalEntries: 2
  totalSize: 3072
```

## Example CLI Usage

```bash
# Create a signed export bundle
provenance export \
  --investigation inv-123 \
  --output ./bundle.tar.gz \
  --sign-key ./private-key.pem

# Verify a bundle
provenance verify \
  --bundle ./bundle.tar.gz \
  --public-key ./public-key.pem

# Query ledger
provenance query \
  --entity-id entity-001 \
  --start-date 2024-01-01 \
  --end-date 2024-01-31

# Validate hash chain integrity
provenance validate-chain \
  --start-sequence 1000 \
  --end-sequence 2000
```

## Implementation Notes

### Hash Chain Algorithm
```typescript
function computeEntryHash(entry: LedgerEntry): string {
  const payload = {
    sequenceNumber: entry.sequenceNumber.toString(),
    previousHash: entry.previousHash,
    operation: entry.operation,
    entityId: entry.entityId,
    timestamp: entry.timestamp,
    actor: entry.actor,
  };

  return sha256(JSON.stringify(payload, Object.keys(payload).sort()));
}

function validateChain(entries: LedgerEntry[]): boolean {
  for (let i = 1; i < entries.length; i++) {
    const computed = computeEntryHash(entries[i - 1]);
    if (entries[i].previousHash !== computed) {
      return false;
    }
  }
  return true;
}
```

## Related Files
- `/home/user/summit/docs/provenance-export.md` - Provenance design
- `/home/user/summit/libs/provenance/` - Existing provenance code
- `/home/user/summit/docs/privacy.md` - Privacy requirements

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 5: Provenance ledger implementation"

# Or use the slash command (if configured)
/provenance-ledger
```

## Notes
- Store ledger in PostgreSQL with TOAST for large entries
- Consider using PostgreSQL's native crypto extensions
- Implement ledger compaction for long-term storage
- Support multiple signature algorithms (RSA, Ed25519)
- Emit metrics for ledger write latency and query performance
