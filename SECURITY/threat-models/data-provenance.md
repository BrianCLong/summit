# STRIDE Threat Model: Data Provenance & Lineage

**Document Version**: 1.0
**Date**: 2025-12-27
**Status**: Active
**Owner**: Security Team
**Review Cadence**: Quarterly

---

## Executive Summary

The Data Provenance subsystem maintains an immutable, cryptographically-verifiable record of data lineage, transformations, and custody chains for all intelligence artifacts in the Summit/IntelGraph platform. This threat model identifies 21 distinct threats that could compromise provenance integrity, chain-of-custody verification, or SLSA Level 3 compliance.

**Key Risk Areas**:

- Lineage record falsification or injection
- Confidence score manipulation to hide low-quality sources
- Cryptographic signature bypass on provenance entries
- Append-only ledger enforcement failures
- Hash collision attacks on artifact fingerprints
- SLSA provenance attestation tampering

**Critical Gaps**:

- Append-only enforcement relies on application logic, not database constraints
- Hash algorithm agility not implemented (locked to SHA-256)
- Provenance signature verification is optional in some code paths
- No real-time provenance chain validation on reads
- SLSA attestation generation lacks secure build environment

**Overall Risk Rating**: CRITICAL (Chain-of-custody is foundational to IC compliance)

---

## System Overview

### Components in Scope

```
┌──────────────────────────────────────────────────────────────────┐
│                    Data Provenance Subsystem                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────────┐  │
│  │   Ingest     │─────▶│ Prov Ledger  │─────▶│ PostgreSQL     │  │
│  │   Pipeline   │      │   Service    │      │ (append-only)  │  │
│  └──────────────┘      └──────────────┘      └────────────────┘  │
│         │                      │                      │           │
│         │                      ▼                      ▼           │
│         │              ┌──────────────┐      ┌────────────────┐  │
│         │              │  Signature   │      │  Merkle Tree   │  │
│         │              │   Service    │      │    (DHT)       │  │
│         │              └──────────────┘      └────────────────┘  │
│         ▼                      │                      │           │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────────┐  │
│  │   Entity     │      │   SLSA       │      │   Audit Log    │  │
│  │   Graph      │      │  Attestation │      │   (immutable)  │  │
│  └──────────────┘      └──────────────┘      └────────────────┘  │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘

Trust Boundaries:
═════════════════════════════════════════════════════════════════════
  [Data Sources] ─────▶ [Ingest Pipeline] ─────▶ [Prov Ledger]
                  TB-1                    TB-2

  [Prov Ledger] ─────▶ [PostgreSQL] ─────▶ [Storage Layer]
                  TB-3               TB-4

  [Applications] ─────▶ [Prov Verification] ─────▶ [Signature Service]
                  TB-5                       TB-6

TB-1: External data boundary (untrusted sources)
TB-2: Transformation boundary (ETL/enrichment)
TB-3: Ledger write boundary (append-only enforcement)
TB-4: Storage boundary (encryption at rest)
TB-5: Provenance read boundary (chain validation)
TB-6: Cryptographic boundary (HSM/KMS)
```

### Data Flow

1. **Provenance Creation**: Data Source → Ingest Pipeline → Provenance Record → Ledger
2. **Signature Generation**: Provenance Record → Hash → Sign (Ed25519) → Store Signature
3. **Chain Linking**: Current Record → Previous Hash → Merkle Tree → Root Hash
4. **Verification**: Read Record → Verify Signature → Validate Chain → Check Integrity
5. **SLSA Attestation**: Build Event → Generate Attestation → Sign → Attach to Artifact

---

## Threat Analysis

### STRIDE Categories

| Category                   | Threat Count | Critical | High  | Medium | Low   |
| -------------------------- | ------------ | -------- | ----- | ------ | ----- |
| **Spoofing**               | 3            | 1        | 2     | 0      | 0     |
| **Tampering**              | 6            | 3        | 2     | 1      | 0     |
| **Repudiation**            | 4            | 2        | 1     | 1      | 0     |
| **Information Disclosure** | 2            | 0        | 1     | 1      | 0     |
| **Denial of Service**      | 3            | 1        | 1     | 1      | 0     |
| **Elevation of Privilege** | 3            | 1        | 2     | 0      | 0     |
| **Total**                  | **21**       | **8**    | **9** | **4**  | **0** |

---

## Detailed Threat Inventory

### Spoofing (S)

| ID       | Threat                        | Description                                                                            | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                            | Status  |
| -------- | ----------------------------- | -------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **S-01** | Provenance Source Spoofing    | Attacker forges `source_id` to attribute low-quality data to trusted source            | 5      | 3          | 15 (Critical) | Validate source identity against authorized source registry; require source authentication (mTLS, API key); sign source metadata; audit source registration changes                   | Partial |
| **S-02** | Transformation Actor Spoofing | Malicious actor impersonates legitimate transformation service to inject false lineage | 4      | 3          | 12 (High)     | Implement service authentication (JWT, mTLS); validate actor identity against service registry; audit all transformation events; use signed transformation manifests                  | Partial |
| **S-03** | Attestation Signer Spoofing   | Attacker uses compromised or stolen signing key to create fake SLSA attestations       | 5      | 2          | 10 (High)     | Use HSM or KMS for signing keys; implement key rotation; require multi-party signatures for critical attestations; audit all signing operations; use short-lived signing certificates | Partial |

---

### Tampering (T)

| ID       | Threat                         | Description                                                                                                  | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                                                                                    | Status          |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------ | ---------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **T-01** | Provenance Record Modification | Attacker modifies existing provenance record (e.g., changes timestamp, confidence score, or lineage pointer) | 5      | 4          | 20 (Critical) | **CRITICAL GAP**: Enforce append-only at database level (PostgreSQL `INSERT`-only grants, row-level security); use immutable storage (WORM); implement Merkle tree for tamper detection; add database triggers to prevent UPDATEs             | Not Implemented |
| **T-02** | Hash Collision Attack          | Attacker finds SHA-256 collision to substitute malicious artifact while preserving hash                      | 5      | 1          | 5 (Medium)    | **CRITICAL GAP**: Implement hash algorithm agility (support SHA-3, BLAKE3); use double-hashing scheme; monitor for collision vulnerabilities; plan migration path to quantum-resistant hashing                                                | Not Implemented |
| **T-03** | Signature Bypass               | Provenance record signature verification skipped or fails silently                                           | 5      | 4          | 20 (Critical) | **CRITICAL GAP**: Make signature verification mandatory (fail-closed); implement signature validation in database layer; use cryptographic commitments; audit all signature verification failures; prevent unsigned records from being stored | Partial         |
| **T-04** | Lineage Chain Breakage         | Attacker deletes or corrupts intermediate provenance records to break chain-of-custody                       | 5      | 3          | 15 (High)     | Implement Merkle tree for chain integrity; use blockchain-style linked hashing; replicate provenance to multiple stores; enable continuous chain validation; alert on broken chains                                                           | Partial         |
| **T-05** | Confidence Score Manipulation  | Attacker inflates confidence score to hide unreliable source or low-quality transformation                   | 4      | 4          | 16 (High)     | Validate confidence scores against acceptable ranges (0.0-1.0); implement confidence calculation auditing; require justification for high-confidence scores; use ML model to detect anomalous confidence patterns                             | Partial         |
| **T-06** | SLSA Attestation Tampering     | Attacker modifies SLSA attestation to upgrade SLSA level or hide insecure build steps                        | 5      | 3          | 15 (Critical) | Sign SLSA attestations with in-toto format; use Sigstore/Rekor transparency log; implement attestation verification in deployment pipeline; audit attestation integrity; require hermetic builds                                              | Partial         |

---

### Repudiation (R)

| ID       | Threat                             | Description                                                                              | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                                         | Status  |
| -------- | ---------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **R-01** | Provenance Creation Denial         | Actor denies creating provenance record due to lack of cryptographic proof               | 5      | 3          | 15 (Critical) | Implement non-repudiation signatures (Ed25519, RSA-PSS); use timestamping service (RFC 3161); store signatures in immutable ledger; integrate with provenance transparency log                     | Partial |
| **R-02** | Data Deletion Without Trace        | Attacker deletes source data and provenance record without audit trail                   | 5      | 2          | 10 (High)     | Implement soft-delete with audit log; prevent hard deletes via database policy; replicate provenance to secondary store; use event sourcing for all provenance changes; alert on deletion attempts | Partial |
| **R-03** | Transformation Attribution Failure | Unable to determine which service performed transformation due to missing actor identity | 3      | 4          | 12 (Medium)   | Require actor identity in all provenance records; validate actor against service registry; implement service-to-service authentication; audit all transformation events                            | Partial |
| **R-04** | Attestation Repudiation            | Builder denies generating SLSA attestation for insecure build                            | 4      | 2          | 8 (Medium)    | Use Sigstore Rekor transparency log for public attestations; implement builder identity verification; store attestations in tamper-evident log; require builder signatures                         | Partial |

---

### Information Disclosure (I)

| ID       | Threat                      | Description                                                                                               | Impact | Likelihood | Risk Score | Mitigation                                                                                                                                                                                         | Status  |
| -------- | --------------------------- | --------------------------------------------------------------------------------------------------------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **I-01** | Provenance Metadata Leakage | Sensitive source identifiers or classification labels exposed in provenance records to unauthorized users | 4      | 3          | 12 (High)  | Implement field-level encryption for sensitive provenance metadata; use ABAC to control provenance access; redact sensitive fields in logs; apply data classification labels to provenance records | Partial |
| **I-02** | SLSA Attestation Exposure   | Build environment details or dependency vulnerabilities leaked through public attestations                | 3      | 3          | 9 (Medium) | Sanitize attestation content before publication; use selective disclosure for sensitive build details; implement access control on attestation retrieval; encrypt attestations at rest             | Partial |

---

### Denial of Service (D)

| ID       | Threat                            | Description                                                                                     | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                                       | Status  |
| -------- | --------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| **D-01** | Provenance Storage Exhaustion     | Attacker creates millions of provenance records to exhaust storage or degrade query performance | 5      | 3          | 15 (Critical) | Implement provenance record quotas per tenant; use archival storage for old records; compress provenance data; implement storage monitoring and alerts; add rate limiting on provenance creation | Partial |
| **D-02** | Chain Validation CPU Exhaustion   | Deep lineage chains (1000+ levels) cause timeout during chain validation                        | 4      | 3          | 12 (High)     | Implement maximum chain depth limits; use caching for validated chains; optimize Merkle tree lookups with indexing; implement validation timeouts; pre-compute chain hashes                      | Partial |
| **D-03** | Signature Verification Bottleneck | High-volume signature verification requests overwhelm signature service                         | 3      | 4          | 12 (Medium)   | Implement signature verification caching; use async verification for non-critical paths; scale signature service horizontally; use hardware crypto acceleration; implement verification batching | Partial |

---

### Elevation of Privilege (E)

| ID       | Threat                                       | Description                                                                           | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                                                        | Status  |
| -------- | -------------------------------------------- | ------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **E-01** | Provenance Ledger Write Privilege Escalation | Low-privilege user gains write access to provenance ledger to inject false records    | 5      | 3          | 15 (Critical) | Implement least-privilege access control (ABAC); separate read/write credentials; audit all ledger write operations; use database row-level security; require multi-party approval for manual provenance entries  | Partial |
| **E-02** | SLSA Level Upgrade Attack                    | Attacker modifies SLSA level in attestation from L1 to L3 to bypass security controls | 5      | 3          | 15 (High)     | Validate SLSA level against build pipeline capabilities; use signed attestations with level claims; implement level verification in deployment pipeline; audit SLSA level changes; prevent manual level overrides | Partial |
| **E-03** | Signature Key Compromise                     | Attacker obtains provenance signing key to create arbitrary signed records            | 5      | 2          | 10 (High)     | Use HSM or KMS for key storage; implement key rotation (quarterly); require MFA for key access; audit all key usage; use short-lived signing certificates; implement key revocation mechanism                     | Partial |

---

## Critical Gaps Summary

### 1. Append-Only Enforcement (T-01)

**Gap**: Append-only behavior is enforced by application logic, not database constraints. Direct database access can modify or delete provenance records.

**Risk**: Complete compromise of chain-of-custody if attacker gains database access.

**Recommendation**:

```sql
-- PostgreSQL: Enforce append-only at database level
REVOKE UPDATE, DELETE ON provenance_records FROM app_user;
GRANT SELECT, INSERT ON provenance_records TO app_user;

-- Row-level security to prevent updates
CREATE POLICY provenance_immutable ON provenance_records
  FOR UPDATE
  USING (false);  -- No updates allowed

-- Trigger to block tampering attempts
CREATE OR REPLACE FUNCTION prevent_provenance_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Provenance records are immutable (append-only)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_provenance_update
  BEFORE UPDATE OR DELETE ON provenance_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_provenance_modification();

-- Audit all access attempts
CREATE TABLE provenance_access_log (
  id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  record_id UUID,
  actor TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  allowed BOOLEAN NOT NULL
);
```

**Priority**: P0 (Critical security control)

---

### 2. Hash Algorithm Agility (T-02)

**Gap**: System is locked to SHA-256 with no migration path to stronger algorithms (SHA-3, BLAKE3) or quantum-resistant hashing.

**Risk**: Future hash collision vulnerabilities cannot be mitigated without major refactoring.

**Recommendation**:

```typescript
// Implement hash algorithm versioning
interface ProvenanceHash {
  algorithm: "sha256" | "sha3-256" | "blake3";
  version: number;
  value: string;
}

// Hash agility in provenance service
class ProvenanceHasher {
  private algorithms = {
    sha256: { version: 1, fn: crypto.createHash("sha256") },
    "sha3-256": { version: 2, fn: crypto.createHash("sha3-256") },
    blake3: { version: 3, fn: blake3.hash },
  };

  hash(data: Buffer, algorithm: string = "blake3"): ProvenanceHash {
    const algo = this.algorithms[algorithm];
    return {
      algorithm,
      version: algo.version,
      value: algo.fn.update(data).digest("hex"),
    };
  }

  verify(data: Buffer, expectedHash: ProvenanceHash): boolean {
    const computed = this.hash(data, expectedHash.algorithm);
    return computed.value === expectedHash.value;
  }
}

// Migration plan
// 1. Add algorithm field to provenance_records table
// 2. Dual-hash new records (SHA-256 + BLAKE3)
// 3. Gradually re-hash existing records
// 4. Deprecate SHA-256 after migration complete
```

**Priority**: P1 (Future-proofing)

---

### 3. Mandatory Signature Verification (T-03)

**Gap**: Signature verification is optional in some code paths, allowing unsigned or invalid records to be processed.

**Risk**: Provenance records can be forged or tampered with undetected.

**Recommendation**:

```typescript
// Fail-closed signature verification
class ProvenanceLedger {
  async writeRecord(record: ProvenanceRecord): Promise<void> {
    // MANDATORY: Verify signature before write
    const isValid = await this.signatureService.verify(
      record.data,
      record.signature,
      record.signer_public_key
    );

    if (!isValid) {
      await this.auditLog.record({
        event: 'signature_verification_failed',
        record_id: record.id,
        severity: 'critical'
      });
      throw new Error('Provenance signature verification failed');
    }

    // Verify chain linkage
    const chainValid = await this.verifyChain(record);
    if (!chainValid) {
      throw new Error('Provenance chain integrity check failed');
    }

    // Only write if all checks pass
    await this.db.insert('provenance_records', record);
  }

  async readRecord(id: string): Promise<ProvenanceRecord> {
    const record = await this.db.select('provenance_records', { id });

    // MANDATORY: Verify on read as well
    const isValid = await this.signatureService.verify(
      record.data,
      record.signature,
      record.signer_public_key
    );

    if (!isValid) {
      throw new Error('Provenance record signature invalid');
    }

    return record;
  }
}

// Database-level check
-- PostgreSQL: Prevent unsigned records
ALTER TABLE provenance_records
  ADD CONSTRAINT signature_required CHECK (signature IS NOT NULL AND signature != '');
```

**Priority**: P0 (Block production deployment)

---

### 4. Real-Time Chain Validation (T-04)

**Gap**: Provenance chain integrity is validated only during writes, not on reads. Broken chains go undetected until audit.

**Risk**: Users may rely on invalid provenance data for critical decisions.

**Recommendation**:

```typescript
// Implement Merkle tree for efficient chain validation
class ProvenanceChainValidator {
  private merkleTree: MerkleTree;

  async validateChain(recordId: string): Promise<boolean> {
    const record = await this.ledger.getRecord(recordId);
    const chain = await this.buildChain(recordId);

    // Verify each link in chain
    for (let i = 1; i < chain.length; i++) {
      const current = chain[i];
      const previous = chain[i - 1];

      if (current.previous_hash !== previous.hash) {
        await this.alertBrokenChain(current.id, previous.id);
        return false;
      }
    }

    // Verify against Merkle root
    const merkleProof = this.merkleTree.getProof(record.hash);
    const rootValid = this.merkleTree.verify(merkleProof, record.hash);

    return rootValid;
  }

  // Background job: Continuous chain validation
  async continuousValidation() {
    setInterval(async () => {
      const recentRecords = await this.ledger.getRecords({
        since: Date.now() - 3600000, // Last hour
      });

      for (const record of recentRecords) {
        const valid = await this.validateChain(record.id);
        if (!valid) {
          await this.alertBrokenChain(record.id);
        }
      }
    }, 60000); // Every minute
  }
}
```

**Priority**: P1 (High impact)

---

### 5. Secure SLSA Attestation Build (T-06)

**Gap**: SLSA attestations are generated in non-hermetic build environments, compromising L3 compliance.

**Risk**: Attestations may not accurately reflect build provenance, allowing supply chain attacks.

**Recommendation**:

```yaml
# GitHub Actions: SLSA L3 compliant build
name: SLSA L3 Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # For Sigstore
      contents: read

    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false

      # Hermetic build environment
      - name: Build in isolated container
        uses: docker://gcr.io/distroless/static:nonroot
        with:
          args: |
            pnpm build --frozen-lockfile

      # Generate SLSA attestation
      - uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0
        with:
          base64-subjects: ${{ steps.hash.outputs.hashes }}
          upload-assets: true

      # Sign with Sigstore
      - uses: sigstore/cosign-installer@v3
      - name: Sign attestation
        run: |
          cosign sign-blob \
            --yes \
            --bundle attestation-bundle.json \
            attestation.json

      # Store in provenance ledger
      - name: Record attestation
        run: |
          pnpm provenance:record \
            --type=slsa-attestation \
            --level=3 \
            --file=attestation.json \
            --signature=attestation-bundle.json
```

**Priority**: P0 (SLSA L3 requirement)

---

## SLSA Level 3 Compliance Mapping

| SLSA Requirement                              | Threat Mitigations                                                       | Status          |
| --------------------------------------------- | ------------------------------------------------------------------------ | --------------- |
| **Build L3**: Hermetic, reproducible builds   | T-06 (Attestation tampering), E-02 (Level upgrade)                       | Partial         |
| **Source L3**: Verified commit signatures     | S-02 (Actor spoofing), R-01 (Creation denial)                            | Partial         |
| **Provenance L3**: Non-falsifiable provenance | T-01, T-03, T-04 (Record modification, signature bypass, chain breakage) | **GAP**         |
| **Common L3**: Isolated build                 | T-06 (Attestation tampering)                                             | Not Implemented |

**Gaps Blocking SLSA L3**:

1. Provenance records not tamper-evident (missing database-level append-only)
2. Build environment not hermetic (missing isolated containers)
3. Signature verification not mandatory (optional in code paths)

---

## Remediation Roadmap

### Phase 1: Critical (0-30 days) - SLSA L3 Blockers

1. **Implement database-level append-only enforcement** (T-01)
   - PostgreSQL row-level security policies
   - Remove UPDATE/DELETE grants
   - Add database triggers to block tampering
   - Test: Attempt direct database UPDATE (should fail)

2. **Make signature verification mandatory** (T-03)
   - Fail-closed verification on all read/write paths
   - Add database constraint for non-null signatures
   - Audit all verification failures
   - Test: Attempt to store unsigned record (should fail)

3. **Implement Merkle tree chain validation** (T-04)
   - Build Merkle tree on provenance writes
   - Validate chain on reads
   - Add continuous background validation
   - Test: Tamper with record, verify chain breaks

4. **Secure SLSA attestation build** (T-06)
   - Hermetic build containers
   - Sigstore/Rekor integration
   - In-toto attestation format
   - Test: Generate L3 attestation, verify in pipeline

### Phase 2: High Priority (30-60 days)

5. **Implement hash algorithm agility** (T-02)
   - Add algorithm field to schema
   - Support SHA-3, BLAKE3
   - Dual-hash migration plan
   - Test: Verify records with multiple algorithms

6. **Add confidence score validation** (T-05)
   - Range validation (0.0-1.0)
   - Anomaly detection for score inflation
   - Audit confidence changes
   - Test: Attempt confidence > 1.0 (should fail)

7. **Implement provenance source registry** (S-01)
   - Authorized source catalog
   - Source authentication (mTLS)
   - Source identity validation
   - Test: Spoof source (should be rejected)

8. **Add HSM/KMS for signing keys** (E-03)
   - Migrate keys to AWS KMS or CloudHSM
   - Implement key rotation
   - Audit key usage
   - Test: Sign with rotated key

### Phase 3: Medium Priority (60-90 days)

9. **Implement storage quotas** (D-01)
   - Per-tenant provenance limits
   - Archival storage for old records
   - Storage monitoring
   - Test: Exceed quota (should be rate-limited)

10. **Add non-repudiation signatures** (R-01)
    - RFC 3161 timestamping
    - Transparency log integration
    - Long-term signature validation
    - Test: Verify signature after key rotation

11. **Implement field-level encryption** (I-01)
    - Encrypt sensitive provenance metadata
    - ABAC for provenance access
    - Log redaction
    - Test: Unauthorized access to sensitive fields

12. **Optimize chain validation** (D-02)
    - Cache validated chains
    - Index Merkle tree lookups
    - Set maximum chain depth
    - Test: Validate 1000-level chain under 1s

---

## Testing & Validation

### Security Test Cases

```typescript
describe("Provenance Security", () => {
  // Critical Gap: Append-only enforcement
  it("should prevent modification of existing provenance records", async () => {
    const record = await provenance.create({
      source: "test-source",
      data: { entity: "test" },
    });

    await expect(
      db.update("provenance_records", { id: record.id }, { data: "tampered" })
    ).rejects.toThrow("Provenance records are immutable");
  });

  // Critical Gap: Mandatory signature verification
  it("should reject unsigned provenance records", async () => {
    const unsignedRecord = {
      source: "test",
      data: { entity: "test" },
      signature: null, // Missing signature
    };

    await expect(provenance.create(unsignedRecord)).rejects.toThrow(
      "Provenance signature verification failed"
    );
  });

  // Critical Gap: Chain integrity validation
  it("should detect broken provenance chain", async () => {
    const record1 = await provenance.create({ data: "first" });
    const record2 = await provenance.create({ data: "second", previous: record1.hash });

    // Tamper with record1 hash (simulate attack)
    await db.rawQuery("UPDATE provenance_records SET hash = $1 WHERE id = $2", [
      "tampered-hash",
      record1.id,
    ]);

    // Chain validation should fail
    const isValid = await provenance.validateChain(record2.id);
    expect(isValid).toBe(false);
  });

  // Hash algorithm agility
  it("should support multiple hash algorithms", () => {
    const data = Buffer.from("test data");

    const sha256Hash = hasher.hash(data, "sha256");
    const blake3Hash = hasher.hash(data, "blake3");

    expect(sha256Hash.algorithm).toBe("sha256");
    expect(blake3Hash.algorithm).toBe("blake3");

    expect(hasher.verify(data, sha256Hash)).toBe(true);
    expect(hasher.verify(data, blake3Hash)).toBe(true);
  });

  // SLSA attestation integrity
  it("should verify SLSA attestation signature", async () => {
    const attestation = await slsa.generate({
      artifact: "build-artifact.tar.gz",
      level: 3,
    });

    const isValid = await slsa.verify(attestation);
    expect(isValid).toBe(true);

    // Tamper with level
    attestation.predicate.buildType = "https://slsa.dev/build/L1";

    await expect(slsa.verify(attestation)).rejects.toThrow(
      "Attestation signature verification failed"
    );
  });
});
```

---

## Monitoring & Detection

### Key Metrics

```yaml
# Prometheus alerts for provenance threats

# Append-only violation detection
- alert: ProvenanceRecordModified
  expr: |
    rate(provenance_update_attempts_total[5m]) > 0
  severity: critical
  annotations:
    summary: Attempt to modify immutable provenance record

# Unsigned record detection
- alert: UnsignedProvenanceRecord
  expr: |
    provenance_signature_verification_failures_total > 0
  severity: critical

# Broken chain detection
- alert: ProvenanceChainBroken
  expr: |
    provenance_chain_validation_failures_total > 0
  severity: critical

# Storage exhaustion warning
- alert: ProvenanceStorageHigh
  expr: |
    provenance_storage_bytes / provenance_storage_limit_bytes > 0.8
  severity: warning

# Confidence score anomaly
- alert: AnomalousConfidenceScore
  expr: |
    rate(provenance_confidence_score_sum[1h]) > 0.95
  severity: warning
  annotations:
    summary: Unusually high confidence scores may indicate manipulation
```

---

## References

- **SLSA Framework**: https://slsa.dev/spec/v1.0/
- **In-Toto Attestation Format**: https://github.com/in-toto/attestation
- **Sigstore/Rekor**: https://docs.sigstore.dev/
- **Merkle Trees for Data Integrity**: https://en.wikipedia.org/wiki/Merkle_tree
- **NIST SP 800-57**: Recommendation for Key Management
- **W3C PROV Data Model**: https://www.w3.org/TR/prov-dm/

---

## Document Control

**Change Log**:

| Version | Date       | Author        | Changes                       |
| ------- | ---------- | ------------- | ----------------------------- |
| 1.0     | 2025-12-27 | Security Team | Initial threat model creation |

**Approval**:

- [ ] Security Architect
- [ ] Engineering Lead
- [ ] Compliance Officer

**Next Review**: 2026-03-27
