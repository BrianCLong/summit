# ADR-0026: Provenance Revocation with Cryptographic Propagation

**Date:** 2026-01-01
**Status:** Proposed
**Area:** AI/ML, Security, Compliance
**Owner:** Provenance Team
**Tags:** provenance, revocation, merkle-tree, incident-response, contamination

## Context

Summit has 30-day provenance validity (ADR-0011), but **no mechanism for retroactive invalidation** when:
- Model discovered to be poisoned
- Data source compromised (database breach)
- Agent found hallucinating systematically
- Regulatory change invalidates prior decisions

**Current problem:** Outputs remain "trusted" even after root cause is contaminated.

**Business impact:**
- Model recall scenario (like automotive recalls) - cannot identify affected outputs
- Regulatory fines (SEC, HIPAA violations from contaminated data)
- Reputational risk (deployed outputs based on poisoned models)

## Decision

### Core Decision

Implement **distributed provenance revocation system** using Merkle tree structure and cryptographic propagation to retroactively invalidate AI outputs when contamination is discovered.

### Key Components

#### 1. Hierarchical Provenance Merkle Tree
- Organize provenance as DAG with Merkle properties:
  - **Root nodes:** Models, data sources
  - **Intermediate nodes:** Prompts, tool calls, agent outputs
  - **Leaf nodes:** Final outputs delivered to users
- Each node: `{content_hash, parent_hash, signature, timestamp}`

#### 2. Revocation Certificate Protocol
- Authority (security team, model vendor, data steward) issues signed certificate:
  ```json
  {
    "revoked_node_hash": "sha256:abc",
    "reason": "model_poisoning_detected",
    "revocation_time": "2026-01-01T10:00:00Z",
    "issuer": "security-team",
    "signature": "ed25519:..."
  }
  ```
- Published to append-only revocation ledger

#### 3. Cryptographic Propagation Engine
- Daemon traverses Merkle tree from revoked node
- Find all children (efficiently via Merkle proof)
- Mark as "tainted" recursively
- Generate **taint proof:** Merkle path from revoked root to leaf

#### 4. Automated Remediation
- For each tainted output:
  - **Notify:** Alert users/systems that consumed it
  - **Quarantine:** Remove from production databases
  - **Regenerate:** Re-execute workflow with clean inputs
  - **Audit trail:** Record all affected systems

#### 5. Performance Optimizations
- **Bloom filter:** O(1) negative lookups ("definitely not revoked")
- **Lazy propagation:** Defer traversal until outputs are accessed
- **Batch revocations:** Single certificate revokes entire subtree

### Implementation Details

**API:**
```json
{
  "method": "mcp.provenance.checkRevocation",
  "params": {
    "output_hash": "sha256:def",
    "check_timestamp": "2026-01-01T12:00:00Z"
  },
  "result": {
    "revoked": true,
    "revocation_time": "2026-01-01T10:00:00Z",
    "reason": "data_source_breach",
    "taint_proof": {
      "merkle_path": ["hash1", "hash2", "hash3"],
      "root_hash": "sha256:abc"
    },
    "affected_outputs_count": 1247
  }
}

{
  "method": "mcp.provenance.revoke",
  "params": {
    "target_hash": "sha256:abc",
    "reason": "model_poisoning",
    "authority": "security-team",
    "signature": "ed25519:..."
  }
}
```

**Performance:**
- Revocation propagation: <30s for 100K affected outputs (parallelized BFS)
- Revocation check: <5ms (Bloom filter + Redis cache)
- Storage: ~200 bytes per Merkle node

## Alternatives Considered

### Alternative 1: Manual Audit Spreadsheets
- **Pros:** No engineering
- **Cons:** Error-prone, doesn't scale, no cryptographic proof
- **Rejected:** Not viable for automated AI systems (thousands of outputs/day)

### Alternative 2: Blockchain Immutability
- **Pros:** Strong tamper-resistance
- **Cons:** Cannot revoke by design (defeats purpose)
- **Rejected:** Need mutability for invalidation

### Alternative 3: Certificate Revocation Lists (CRLs)
- **Pros:** PKI standard (proven technology)
- **Cons:** Designed for single-entity revocation, not transitive contamination graphs
- **Rejected:** Doesn't handle compositional provenance (Output A depends on B depends on C)

## Consequences

### Positive
- **Incident response:** Model recall capability (identify all affected outputs in <1 minute)
- **Cryptographic guarantees:** Merkle proofs provide verifiable evidence of contamination chains
- **Scalability:** O(log N) lookup with Bloom filter
- **Compliance:** Meets regulatory recall requirements (SEC, FDA for AI/ML in regulated industries)
- **No prior art:** No existing AI provenance system has this capability

### Negative
- **Storage overhead:** ~100 bytes per provenance record (Merkle nodes)
- **Propagation latency:** 30s delay for large-scale revocations (acceptable for incident response)
- **External dependency:** Requires ecosystem adoption for cross-system propagation

### Operational Impact
- **Monitoring:** Metrics: `revocation_propagation_latency`, `tainted_outputs_count`
- **Incident Response:** Automated playbook triggers on revocation
- **Compliance:** Audit trail for regulatory investigations

## Code References

### Core Implementation
- `agents/governance/src/provenance/revocation-daemon.ts` (~800 lines) - Merkle traversal
- `agents/governance/src/provenance/merkle-builder.ts` (~400 lines) - Incremental tree construction
- `agents/governance/src/provenance/AIProvenanceManager.ts:L234-L289` - Integration

### Data Models
- `migrations/034_create_revocation_ledger.sql`:
  ```sql
  CREATE TABLE revocation_ledger (
    revoked_hash TEXT PRIMARY KEY,
    reason TEXT,
    revocation_time TIMESTAMPTZ,
    issuer TEXT,
    signature TEXT
  );

  CREATE TABLE provenance_merkle_tree (
    node_hash TEXT PRIMARY KEY,
    parent_hash TEXT,
    content_hash TEXT,
    depth INT
  );
  ```

### APIs
- `server/src/api/provenance-revocation-api.ts` - GraphQL mutations

## Tests & Validation

### Evaluation Criteria
- **Correctness:** 100% of affected outputs identified (no false negatives)
- **Performance:** Propagation <30s for 100K outputs
- **Security:** Cryptographic signature verification on all revocation certificates

### CI Enforcement
- Golden path test: "Revocation propagates to all descendants"
- Security test: "Unsigned revocation rejected"

## Migration & Rollout

### Timeline
- Phase 1: Merkle tree schema (Months 1-2)
- Phase 2: Propagation daemon (Months 3-4)
- Phase 3: Automated remediation (Months 5-6)
- Completion: GA (Month 6)

## References

### Related ADRs
- ADR-0011: Provenance Ledger Schema (foundation)
- ADR-0023: Cryptographic Context Confinement (revocation of encrypted contexts)
- ADR-0025: Token-Level Provenance (fine-grained deletion post-revocation)

### External Resources
- [Merkle Trees](https://en.wikipedia.org/wiki/Merkle_tree) - Cryptographic data structure
- [SLSA Provenance](https://slsa.dev/provenance/) - Software supply chain provenance standard
- [SEC Market Access Rule 15c3-5](https://www.sec.gov/rules/final/2010/34-63241.pdf) - Risk controls

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-01-01 | Provenance Team | Initial version (patent defensive publication) |
