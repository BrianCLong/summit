# Prompt #2: Provenance & Claim Ledger (Beta)

**Target**: Beta Q4 2025
**Owner**: Provenance team
**Depends on**: Core GA, Neo4j, Redis Streams

---

## Pre-Flight Checklist

```bash
# ✅ Check existing scaffolding
ls -la services/prov-ledger/
cat services/prov-ledger/README.md

# ✅ Verify dependencies
docker ps | grep neo4j
docker ps | grep redis

# ✅ Check Helm chart exists
ls -la charts/ig-platform/values.yaml | grep provLedger
```

**Expected**: `services/prov-ledger/` exists with README. Helm chart configured (port 4010).

---

## Claude Prompt

```
You are implementing the Prov-Ledger beta service for IntelGraph.

CONTEXT:
- Existing scaffolding: services/prov-ledger/ (basic structure, needs implementation)
- Stack: FastAPI or Node.js (choose based on team preference), Neo4j, Redis Streams
- Helm chart: charts/ig-platform/values.yaml (provLedger service on port 4010)
- Frontend: apps/web/src/components/

REQUIREMENTS:
Build a provenance and claim ledger service with:

1. **Evidence Registration API**:
   - POST /evidence/register
   - Payload: {caseId, source, hash, metadata, uploadedBy, timestamp}
   - Store in Neo4j: (Evidence)-[:SUPPORTS]->(Claim)
   - Generate unique evidence ID with content hash (SHA-256)
   - Return: {evidenceId, hash, registrationTimestamp}

2. **Claim Parsing**:
   - POST /claim/parse
   - Input: {evidenceId, claimText, extractedFacts}
   - Create Claim nodes in Neo4j
   - Link to Evidence: (Claim)-[:EXTRACTED_FROM]->(Evidence)
   - Auto-detect contradictions: (Claim)-[:CONTRADICTS]->(Claim)
   - Return: {claimId, facts[], contradictions[]}

3. **Contradiction Graph**:
   - GET /contradictions/{caseId}
   - Return graph of conflicting claims
   - Include: claimId, sourceEvidence, contradictingClaims[]
   - Render in UI: apps/web/src/components/provenance/ContradictionGraph.tsx

4. **Export Manifest (Verifiable Bundles)**:
   - POST /export/manifest
   - Payload: {caseId, includeEvidence[], redactions[]}
   - Generate:
     - Merkle tree of evidence hashes
     - Transform chain: Evidence → Claims → Export
     - Signature: HMAC-SHA256 or Ed25519
   - Format: JSON manifest + tarball of files
   - Return: {manifestUrl, merkleRoot, signature}

5. **External Verifier CLI**:
   - tools/ppw-verify.ts (or ppw-verify.py)
   - Usage: ppw-verify --manifest export.json --tarball evidence.tar.gz
   - Checks:
     - Merkle root matches
     - All hashes valid
     - Signature verifies
     - No tampering detected
   - Exit 0 on success, 1 on failure

DELIVERABLES:

1. services/prov-ledger/src/routes/evidence.ts (or evidence.py)
   - POST /evidence/register
   - GET /evidence/{evidenceId}

2. services/prov-ledger/src/routes/claim.ts (or claim.py)
   - POST /claim/parse
   - GET /claim/{claimId}
   - GET /contradictions/{caseId}

3. services/prov-ledger/src/routes/export.ts (or export.py)
   - POST /export/manifest
   - GET /export/{exportId}

4. services/prov-ledger/src/lib/merkle-tree.ts (or merkle.py)
   - export class MerkleTreeBuilder
   - Methods: addLeaf(hash), buildTree(), getRoot(), getProof(leaf)
   - Unit tests: verify proofs

5. services/prov-ledger/src/lib/contradiction-detector.ts
   - export class ContradictionDetector
   - Methods: findContradictions(claims), scoreContradiction(c1, c2)
   - Use NLP or simple keyword matching for MVP

6. apps/web/src/components/provenance/ExportDialog.tsx
   - UI: Select evidence items → Build bundle → Preview manifest → Download
   - Show Merkle tree visualization
   - Display signature and verification instructions

7. apps/web/src/components/provenance/ContradictionGraph.tsx
   - Render contradiction graph using Cytoscape.js or D3
   - Highlight conflicting claims in red

8. tools/ppw-verify (CLI verifier)
   - Standalone tool (no IntelGraph deps)
   - Works offline
   - Clear success/failure messages

9. Tests:
   - services/prov-ledger/tests/test_evidence.py (or .test.ts)
   - services/prov-ledger/tests/test_claims.py
   - services/prov-ledger/tests/test_export.py
   - Integration test: Register 5 evidence items → export → verify with CLI

ACCEPTANCE CRITERIA:
✅ Given a case with 5 evidence items → export produces verifiable manifest
✅ CLI verifier returns OK (exit 0) on valid bundles
✅ Contradiction graph renders in UI for conflicting claims
✅ Merkle proofs validate for all evidence items
✅ Export bundles work offline (no API calls required for verification)

TECHNICAL CONSTRAINTS:
- Neo4j 5.24.0: Use constraint for unique evidence hashes
  CREATE CONSTRAINT evidence_hash IF NOT EXISTS FOR (e:Evidence) REQUIRE e.hash IS UNIQUE
- Redis Streams: Publish events (evidence_registered, claim_parsed, export_created)
- Manifest format: JSON with JSON Schema validation
- Signature: Use crypto.createHmac() (Node) or hmac.new() (Python)

SAMPLE MANIFEST STRUCTURE:
```json
{
  "version": "1.0",
  "caseId": "case-123",
  "exportedAt": "2025-11-29T10:00:00Z",
  "merkleRoot": "abc123...",
  "evidence": [
    {
      "evidenceId": "ev-1",
      "hash": "sha256:def456...",
      "filename": "document.pdf",
      "size": 1024,
      "merkleProof": ["hash1", "hash2"]
    }
  ],
  "claims": [
    {
      "claimId": "cl-1",
      "text": "Transaction occurred on 2025-01-15",
      "evidenceId": "ev-1",
      "contradictions": ["cl-2"]
    }
  ],
  "signature": "hmac:xyz789...",
  "transformChain": [
    {"step": "ingest", "timestamp": "..."},
    {"step": "claim_extraction", "timestamp": "..."},
    {"step": "export", "timestamp": "..."}
  ]
}
```

OUTPUT:
Provide:
(a) Service implementation (FastAPI or Express)
(b) Neo4j schema (Cypher constraints/indexes)
(c) React components with Storybook stories
(d) CLI verifier tool with --help docs
(e) Integration test suite
(f) API documentation (OpenAPI/Swagger)
```

---

## Success Metrics

- [ ] Export manifest verifies successfully with CLI (5/5 test cases)
- [ ] Contradiction detection finds conflicts in test dataset
- [ ] UI renders Merkle tree and contradiction graph
- [ ] External verifier has zero dependencies on IntelGraph stack

---

## Follow-Up Prompts

1. **Add timestamping service**: Integrate with RFC 3161 TSA for legally admissible timestamps
2. **Blockchain anchoring**: Optionally anchor Merkle roots to public blockchain
3. **Redaction support**: Selective disclosure with cryptographic commitments

---

## References

- Existing scaffolding: `services/prov-ledger/README.md`
- Helm chart: `charts/ig-platform/values.yaml` (provLedger service)
- Merkle trees: https://en.wikipedia.org/wiki/Merkle_tree
- HMAC: https://nodejs.org/api/crypto.html#crypto_crypto_createhmac_algorithm_key_options
