# Zero-Knowledge Deconfliction (ZK-TX)

A runnable prototype that checks selector overlaps across tenants **without revealing raw values**. Uses salted hashing + ZK set proof techniques to return only true/false with audit logging.

## Features

- ✅ **Zero-knowledge overlap detection**: Check if two sets intersect without revealing elements
- ✅ **Salted commitments**: Each tenant uses unique salt to prevent rainbow table attacks
- ✅ **Cryptographic proofs**: Generate verifiable proofs of overlap results
- ✅ **Audit logging**: Tamper-evident log of all deconfliction operations
- ✅ **REST API**: Simple HTTP endpoints for integration
- ✅ **No data leakage**: Only boolean overlap + count are revealed

## Quick Start

```bash
cd services/zk-deconfliction
pnpm install
pnpm build
pnpm start
```

Server runs on `http://localhost:3100`

## API Endpoints

### Generate Salt

```bash
curl -X POST http://localhost:3100/zk/salt \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "org-alpha"}'
```

Response:
```json
{
  "tenantId": "org-alpha",
  "salt": "abc123...",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

### Create Commitments

```bash
curl -X POST http://localhost:3100/zk/commit \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "org-alpha",
    "values": ["selector-1", "selector-2", "selector-3"]
  }'
```

Response:
```json
{
  "tenantId": "org-alpha",
  "commitments": ["hash1...", "hash2...", "hash3..."],
  "count": 3,
  "merkleRoot": "root-hash..."
}
```

### Check Deconfliction (ZK Overlap)

```bash
curl -X POST http://localhost:3100/zk/deconflict \
  -H "Content-Type: application/json" \
  -d '{
    "tenantAId": "org-alpha",
    "tenantBId": "org-beta",
    "tenantACommitments": ["hash-a1", "hash-a2", "hash-a3"],
    "tenantBCommitments": ["hash-b1", "hash-a2", "hash-b3"],
    "auditContext": {"case": "investigation-123"}
  }'
```

Response:
```json
{
  "hasOverlap": true,
  "overlapCount": 1,
  "proof": "zk-proof-hash...",
  "auditLogId": "log-uuid",
  "timestamp": "2025-01-15T10:05:00Z"
}
```

**Note**: Only `hasOverlap` and `overlapCount` are revealed. The actual overlapping elements remain private.

### Retrieve Audit Logs

```bash
# All logs
curl http://localhost:3100/zk/audit

# Logs for specific tenant
curl http://localhost:3100/zk/audit?tenantId=org-alpha

# Specific log entry
curl http://localhost:3100/zk/audit/log-uuid
```

## Usage Flow

### Scenario: Two agencies want to check if they're targeting the same entities

1. **Agency A** generates a salt and commitments:
   ```bash
   POST /zk/salt {"tenantId": "agency-a"}
   # Store salt securely

   POST /zk/commit {
     "tenantId": "agency-a",
     "values": ["target-alice", "target-bob", "target-charlie"]
   }
   # Receive commitments: [c1, c2, c3]
   ```

2. **Agency B** does the same:
   ```bash
   POST /zk/salt {"tenantId": "agency-b"}
   POST /zk/commit {
     "tenantId": "agency-b",
     "values": ["target-bob", "target-diana", "target-eve"]
   }
   # Receive commitments: [c4, c5, c6]
   ```

3. **Deconfliction coordinator** checks overlap:
   ```bash
   POST /zk/deconflict {
     "tenantAId": "agency-a",
     "tenantBId": "agency-b",
     "tenantACommitments": [c1, c2, c3],
     "tenantBCommitments": [c4, c5, c6]
   }
   # Result: hasOverlap=true, count=1 (if same salt was used for 'bob')
   # Neither agency learns WHO overlaps, only THAT there is overlap
   ```

4. **Audit trail** is automatically created and retrievable.

## Programmatic API

```typescript
import {
  CommitmentGenerator,
  ZKSetProof,
  AuditLogger,
} from '@intelgraph/zk-deconfliction';

// Generate commitments
const gen = new CommitmentGenerator();
const salt = gen.generateSalt('tenant-a');
const commitments = gen.commitSet(
  ['alice', 'bob', 'charlie'],
  'tenant-a',
  salt.salt,
);

// Check overlap
const zkProof = new ZKSetProof();
const result = zkProof.checkOverlap(
  commitmentsA.map(c => c.hash),
  commitmentsB.map(c => c.hash),
);

console.log(`Overlap: ${result.hasOverlap}, Count: ${result.count}`);

// Generate proof
const proof = zkProof.generateProof(
  'tenant-a',
  'tenant-b',
  commitmentsA,
  commitmentsB,
  result.hasOverlap,
  result.count,
);

// Audit log
const logger = new AuditLogger();
logger.log('tenant-a', 'tenant-b', result.hasOverlap, result.count, proof);
```

## Security Model

### What is Protected

- ✅ **Raw selector values** never leave client
- ✅ **Set contents** remain private
- ✅ **Which elements overlap** not revealed (only count)
- ✅ **Salts** prevent rainbow table attacks

### What is Revealed

- ⚠️ **Boolean overlap** (true/false)
- ⚠️ **Overlap count** (number of intersections)
- ⚠️ **Set sizes** can be inferred from commitment count

### Limitations (Demo Implementation)

- **Same-salt requirement**: Both parties must use the same salt for overlap detection (coordination needed)
- **No true ZK-SNARKs**: Uses hash-based proofs, not cryptographic ZK circuits
- **In-memory storage**: Salts/logs stored in memory (use persistent DB in production)

### Production Enhancements

- [ ] Implement true ZK-SNARKs using `snarkjs`/`circom`
- [ ] Support multi-party computation (MPC) for salt-free deconfliction
- [ ] Add differential privacy noise to counts
- [ ] Store commitments in blockchain for non-repudiation
- [ ] HSM integration for key management

## Testing

```bash
pnpm test
pnpm test --coverage
```

## Docker

```bash
docker build -t zk-deconfliction .
docker run -p 3100:3100 zk-deconfliction
```

## Integration with Summit/IntelGraph

Integrates with:
- **Policy Compiler**: Enforce deconfliction policies
- **Audit Service**: Long-term audit log storage
- **Investigation Service**: Deconflict case selectors
- **Multi-Tenant Gateway**: Route requests by tenant

## License

Part of Summit/IntelGraph platform.
