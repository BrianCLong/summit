# Prompt #10: Disclosure Packager / Portable Provenance Wallets

**Target**: Core GA Q4 2025
**Owner**: Legal/compliance team
**Depends on**: Prov-Ledger (Prompt #2), Claim graphs, Crypto signing

---

## Pre-Flight Checklist

```bash
# ✅ Check provenance infrastructure
ls -la services/prov-ledger/
grep -r "selective.*disclosure\|wallet" services/*/

# ✅ Verify crypto libraries
node -e "const crypto = require('crypto'); console.log('Ed25519 available:', crypto.getCurves().includes('ed25519'))"

# ✅ Check existing export functionality
find . -name "*export*" -o -name "*bundle*" | grep -E "\.ts$|\.py$" | head -10
```

---

## Claude Prompt

```
You are implementing the Disclosure Packager for IntelGraph - selective disclosure bundles for court/press/partners.

CONTEXT:
- Existing: services/prov-ledger/ (from Prompt #2)
- Stack: Node.js or Python (FastAPI), Neo4j, React
- Frontend: apps/web/src/components/
- Use case: Package evidence for legal proceedings, FOIA requests, partner sharing

REQUIREMENTS:
Build selective disclosure system with:

1. **Audience-Scoped Bundles**:
   - Create bundles for specific audiences: court, press, partner, public
   - Scope controls:
     - court: Full evidence + claims + metadata
     - press: Redacted PII + summary claims
     - partner: Selective entities + relationships
     - public: Aggregated stats only (no PII)
   - UI: apps/web/src/components/disclosure/DisclosurePackager.tsx
   - Select: Audience → Auto-apply redaction rules

2. **Claim Graphs**:
   - Include: (Evidence)-[:SUPPORTS]->(Claim)-[:CONTRADICTS]->(Claim)
   - Bundle: Subgraph of relevant claims + evidence
   - Export: GraphML or JSON-LD with RDF triples
   - Verify: External tools can validate claim chain

3. **Signatures (Ed25519 or RSA)**:
   - Sign: Entire bundle with private key
   - Public key: Included in manifest for verification
   - Algorithm: Ed25519 (preferred) or RSA-2048
   - Timestamp: Include trusted timestamp (RFC 3161 TSA optional)

4. **Time-Boxed Access**:
   - Bundle includes: validUntil timestamp
   - Enforcement: External viewer checks timestamp before display
   - Expiration: After validUntil, bundle shows "Expired" warning
   - Use case: Temporary access for partners (30-day review)

5. **Revocation**:
   - Revocation list: services/disclosure/revocations.json
   - Check: On bundle open, fetch revocation list (HTTP or local)
   - Revoked bundles: Show "Revoked by issuer" message
   - Propagation: Email notification to recipients on revoke

6. **Selective Redaction**:
   - Field-level: Redact specific fields (e.g., SSN, email)
   - Entity-level: Exclude entire entities
   - Relationship-level: Remove sensitive edges
   - Proof: Include hash of original (redacted fields)
   - Unredacted hash: Proves no tampering of redacted content

7. **External Verifier Tool**:
   - tools/ppw-verify (CLI or web tool)
   - Input: Bundle file (tar.gz or zip)
   - Checks:
     - Signature valid (verify with public key)
     - Merkle tree intact (all hashes match)
     - Not revoked (check revocation list)
     - Not expired (validUntil > now)
   - Output: "✅ Bundle verified" or "❌ Verification failed: <reason>"

DELIVERABLES:

1. services/disclosure/
   - Framework: FastAPI (Python) OR Express (Node.js)
   - Routes:
     - POST /disclosure/create (create bundle)
     - POST /disclosure/revoke (revoke bundle)
     - GET /disclosure/{bundleId} (download)
     - GET /disclosure/revocations (revocation list)

2. services/disclosure/src/bundler.ts (or .py)
   - export class BundleBuilder
   - Methods: addEvidence(id), addClaim(id), applyRedactions(rules), build()
   - Output: {manifest, files[], signature}

3. services/disclosure/src/signature.ts (or .py)
   - export class BundleSigner
   - Methods: sign(bundle, privateKey), verify(bundle, publicKey)
   - Use: @noble/ed25519 (Node) or cryptography (Python)

4. services/disclosure/src/revocation.ts (or .py)
   - export class RevocationManager
   - Methods: revoke(bundleId, reason), checkRevoked(bundleId)
   - Storage: JSON file or PostgreSQL table

5. services/disclosure/src/redactor.ts (or .py)
   - export class SelectiveRedactor
   - Methods: redactField(entity, field), redactEntity(id), redactRelationship(id)
   - Include: Hash of original (proof of redaction)

6. apps/web/src/components/disclosure/DisclosurePackager.tsx
   - UI: Multi-step wizard
   - Steps:
     1. Select audience (court, press, partner, public)
     2. Select evidence/claims
     3. Preview bundle (tree view)
     4. Apply redactions (optional)
     5. Set expiration (optional)
     6. Sign & download
   - Preview: Show Merkle tree, signature, expiration

7. apps/web/src/components/disclosure/BundlePreview.tsx
   - Tree view: Hierarchical view of bundle contents
   - Icons: Evidence (file), Claim (speech bubble), Redacted (mask)
   - Actions: Expand/collapse, remove item

8. tools/ppw-verify/
   - CLI tool: Node.js or Python script
   - Usage: ppw-verify --bundle export.tar.gz --public-key key.pub
   - Checks: Signature, Merkle tree, revocation, expiration
   - Output: Colored (green=pass, red=fail)

9. tools/ppw-verify/web/
   - Web-based verifier (HTML + JS, no server)
   - Upload: Bundle file
   - Display: Verification status, manifest details
   - Offline: Works without internet (revocation check optional)

10. libs/ppw-format/
    - Shared library: Bundle format spec
    - Schema: JSON Schema for manifest
    - Validation: Validate bundle structure

11. Tests:
    - services/disclosure/tests/test_bundler.py (or .test.ts)
    - services/disclosure/tests/test_signature.py
    - services/disclosure/tests/test_revocation.py
    - Integration: Create bundle → Verify with CLI → Revoke → Verify fails

ACCEPTANCE CRITERIA:
✅ Tamper detection: Modified bundle fails verification
✅ Selective redaction honored (redacted fields not visible)
✅ Revocation propagates: Revoked bundle shows warning in verifier
✅ Time-boxed access: Expired bundles show expiration warning
✅ External verifier: CLI returns OK for valid bundles, fails for invalid

TECHNICAL CONSTRAINTS:
- Signature: Ed25519 (preferred) or RSA-2048
- Bundle format: tar.gz or zip with manifest.json + files/
- Manifest schema: JSON Schema v7 validation
- Revocation list: JSON file hosted on HTTPS (or local)
- Expiration: Use ISO 8601 timestamps
- Offline verification: CLI works without internet (except revocation check)

SAMPLE BUNDLE STRUCTURE:
```
disclosure-bundle-123.tar.gz
├── manifest.json
├── evidence/
│   ├── ev-1.pdf
│   ├── ev-2.jpg
│   └── ev-3.csv
├── claims.json
├── graph.graphml
├── signature.sig
└── public-key.pem
```

SAMPLE MANIFEST.JSON:
```json
{
  "version": "1.0",
  "bundleId": "bundle-123",
  "caseId": "case-456",
  "audience": "court",
  "createdAt": "2025-11-29T10:00:00Z",
  "createdBy": "analyst-789",
  "validUntil": "2026-01-29T10:00:00Z",
  "merkleRoot": "abc123...",
  "evidence": [
    {
      "evidenceId": "ev-1",
      "filename": "evidence/ev-1.pdf",
      "hash": "sha256:def456...",
      "redacted": false,
      "merkleProof": ["hash1", "hash2"]
    },
    {
      "evidenceId": "ev-2",
      "filename": "evidence/ev-2.jpg",
      "hash": "sha256:ghi789...",
      "redacted": true,
      "redactedFields": ["person.ssn", "person.email"],
      "originalHash": "sha256:jkl012...",
      "merkleProof": ["hash3", "hash4"]
    }
  ],
  "claims": [
    {
      "claimId": "cl-1",
      "text": "Transaction occurred on 2025-01-15",
      "evidenceIds": ["ev-1"],
      "contradictions": []
    }
  ],
  "signature": {
    "algorithm": "Ed25519",
    "publicKey": "base64:...",
    "signature": "base64:...",
    "timestamp": "2025-11-29T10:00:00Z"
  },
  "revocationUrl": "https://intelgraph.io/disclosure/revocations.json"
}
```

SAMPLE REVOCATION LIST (revocations.json):
```json
{
  "revoked": [
    {
      "bundleId": "bundle-456",
      "revokedAt": "2025-12-01T12:00:00Z",
      "reason": "Superseded by updated evidence",
      "revokedBy": "analyst-789"
    }
  ]
}
```

SAMPLE CLI VERIFIER USAGE:
```bash
# Verify bundle
ppw-verify --bundle disclosure-bundle-123.tar.gz

# Output:
✅ Signature valid (Ed25519)
✅ Merkle tree intact (5 evidence items)
✅ Not revoked
✅ Not expired (valid until 2026-01-29)
✅ Bundle verified successfully

# Tampered bundle
ppw-verify --bundle tampered-bundle.tar.gz

# Output:
❌ Signature invalid (hash mismatch)
❌ Verification failed
```

SAMPLE SIGNATURE CODE (Node.js):
```typescript
import { sign, verify } from '@noble/ed25519';
import { createHash } from 'crypto';

async function signBundle(manifest: any, privateKey: Uint8Array): Promise<string> {
  const message = JSON.stringify(manifest);
  const hash = createHash('sha256').update(message).digest();
  const signature = await sign(hash, privateKey);
  return Buffer.from(signature).toString('base64');
}

async function verifyBundle(manifest: any, signature: string, publicKey: Uint8Array): Promise<boolean> {
  const message = JSON.stringify(manifest);
  const hash = createHash('sha256').update(message).digest();
  const sig = Buffer.from(signature, 'base64');
  return await verify(sig, hash, publicKey);
}
```

OUTPUT:
Provide:
(a) Disclosure service (FastAPI or Express)
(b) Bundle builder + signer
(c) Revocation manager
(d) Selective redactor
(e) React components (DisclosurePackager, BundlePreview)
(f) CLI verifier tool
(g) Web-based verifier (offline-capable)
(h) Tests (tamper detection, revocation, expiration)
(i) User guide (how to create & verify bundles)
```

---

## Success Metrics

- [ ] Tamper detection: 100% of modified bundles fail verification
- [ ] Selective redaction: Redacted fields not visible in verifier
- [ ] Revocation: 100% of revoked bundles show warning
- [ ] Expiration: Expired bundles show warning
- [ ] External verifier: 0 dependencies on IntelGraph stack

---

## Follow-Up Prompts

1. **Zero-knowledge proofs**: Prove claim without revealing evidence
2. **Blockchain anchoring**: Anchor Merkle root to public blockchain
3. **Multi-signature**: Require 2-of-3 signatures for sensitive bundles

---

## References

- Provenance ledger: `services/prov-ledger/` (Prompt #2)
- Ed25519: https://github.com/paulmillr/noble-ed25519
- RFC 3161 TSA: https://www.ietf.org/rfc/rfc3161.txt
- JSON Schema: https://json-schema.org/
