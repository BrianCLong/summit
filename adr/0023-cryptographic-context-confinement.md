# ADR-0023: Cryptographic Context Confinement Proofs for Multi-Agent Systems

**Date:** 2026-01-01
**Status:** Proposed
**Area:** AI/ML, Auth/Security
**Owner:** Conductor Team
**Tags:** mcp, security, zero-knowledge, multi-agent, cryptography, context-isolation

## Context

Summit's multi-agent MCP architecture enables agents to share context via blackboard patterns and message passing. Current isolation mechanisms include:

- **Tenant-level isolation:** PostgreSQL row-level security (RLS) scopes queries
- **Agent mandates:** Policy-defined permissions limiting agent capabilities
- **Provenance tracking:** SLSA Level 3 attestations for outputs

However, there is **no cryptographic proof** that context was confined to authorized agents during execution. Specific gaps:

1. **No context boundary attestation:** Cannot prove context wasn't observed by unauthorized agents
2. **Plaintext handoffs:** Context passes through orchestrator as plaintext (encrypted only in transit via TLS)
3. **Insider threat:** Orchestrator operator with database access can read all context
4. **Forensic gap:** Cannot retroactively verify "Agent X never had access to Context Y"

**Business Context:**

- Government/defense customers require cryptographic proof of compartmentalization (NIST SP 800-53 AC-4)
- Zero-trust architecture mandate: verify cryptographically, not via access control alone
- Competitive differentiator for FedRAMP High, DoD IL5+

**Technical Context:**

- Current `BlackboardContext` stores results as plaintext in PostgreSQL
- Agent-to-agent communication via WebSocket (MCP JSON-RPC 2.0)
- No zero-knowledge proof infrastructure in place

## Decision

### Core Decision

Implement **cryptographic context confinement** using ephemeral key encryption and zero-knowledge proofs to provide verifiable evidence that context was confined to authorized agent boundaries.

### Key Components

#### 1. Context Capsule Encryption

- **Location:** `server/src/conductor/mcp/context-capsule-manager.ts`
- **Mechanism:**
  - When Agent A produces context for Agent B, encrypt with Agent B's ephemeral X25519 public key
  - Capsule structure: `{payload, timestamp, source_agent_id, intended_recipient_id, nonce, signature}`
  - Agent A signs capsule with Ed25519 execution key
- **Properties:** Only Agent B possesses decryption key; orchestrator cannot read plaintext

#### 2. Zero-Knowledge Boundary Proofs

- **Location:** `server/src/conductor/crypto/zkcontext.ts`
- **Mechanism:**
  - Agent B proves to orchestrator "I possess valid context from Agent A" without revealing contents
  - zk-SNARK (Groth16 or PLONK) proves:
    - `H(decrypted_payload) == commitment_in_provenance_ledger`
    - `current_timestamp - capsule_timestamp < max_age_policy`
    - `recipient_id == my_agent_id`
  - Orchestrator verifies proof (<10ms) without seeing plaintext
- **Properties:** Privacy-preserving authorization

#### 3. Confinement Ledger

- **Location:** `agents/governance/src/provenance/confinement-ledger.ts`
- **Schema:** PostgreSQL table
  ```sql
  CREATE TABLE confinement_ledger (
    capsule_hash TEXT PRIMARY KEY,
    source_agent_id UUID NOT NULL,
    dest_agent_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    zk_proof_hash TEXT NOT NULL,
    revoked_at TIMESTAMPTZ
  );
  ```
- **Purpose:** Immutable audit trail of all context handoffs

#### 4. Revocation Mechanism

- **Location:** Extend `agents/governance/src/incident-response/`
- **Mechanism:**
  - If agent compromise detected, publish revocation to ledger (`UPDATE confinement_ledger SET revoked_at = NOW() WHERE source_agent_id = ?`)
  - Downstream agents verify capsules against revocation list
  - Contaminated contexts auto-quarantine

### Implementation Details

**MCP Protocol Extensions:**

```json
// New method: mcp.context.capsule.create
{
  "jsonrpc": "2.0",
  "method": "mcp.context.capsule.create",
  "params": {
    "payload": {...},
    "recipient_agent_id": "agent-b-uuid",
    "max_age_seconds": 300
  },
  "result": {
    "capsule": "base64_encrypted",
    "commitment": "sha3-256:abc..."
  }
}

// New method: mcp.context.capsule.verify
{
  "jsonrpc": "2.0",
  "method": "mcp.context.capsule.verify",
  "params": {
    "capsule": "base64_encrypted",
    "zk_proof": "groth16_proof_base64"
  },
  "result": {
    "valid": true,
    "source_agent": "agent-a-uuid",
    "timestamp": "2026-01-01T12:00:00Z"
  }
}
```

**Integration with Orchestrator:**

- Hook into `BlackboardContext.addResult()` → auto-encrypt on write
- Intercept `WorkflowStep.execute()` → verify zk-proof before agent invocation
- Record all proofs in confinement ledger

**Cryptographic Dependencies:**

- `@noble/curves` - X25519 key exchange, Ed25519 signatures
- `snarkjs` - Groth16 zk-SNARK proving/verification
- `@stablelib/blake3` - Fast cryptographic hashing

## Alternatives Considered

### Alternative 1: Homomorphic Encryption

- **Description:** Encrypt context with fully homomorphic encryption (FHE), allowing computation on encrypted data
- **Pros:** Strongest confidentiality guarantee; operators never see plaintext
- **Cons:**
  - 100-1000x performance overhead (too slow for real-time agents)
  - Limited FHE operations (can't run arbitrary LLM inference)
  - Immature libraries (SEAL, HElib not production-ready for LLMs)
- **Cost/Complexity:** Research-grade, 12+ months

### Alternative 2: Trusted Execution Environments (TEEs)

- **Description:** Run orchestrator in SGX/SEV enclave; hardware-enforced isolation
- **Pros:** Strong isolation; industry-proven (Azure Confidential Computing)
- **Cons:**
  - Requires specialized hardware (limits cloud portability)
  - Enclave memory limits (512MB-256GB)
  - Performance overhead (10-20%)
- **Cost/Complexity:** 6-12 months, hardware dependency
- **Note:** This is tracked separately as ADR-0029 (Confidential MCP Execution)

### Alternative 3: Simple Encryption Without ZK Proofs

- **Description:** Encrypt context with recipient's key, skip zk-proof verification
- **Pros:** Simpler implementation, no zk-SNARK complexity
- **Cons:**
  - Orchestrator must decrypt to verify policy compliance
  - No cryptographic proof of confinement (defeats purpose)
  - Insider threat still exists
- **Cost/Complexity:** 3 months, but insufficient security

## Consequences

### Positive

- **Cryptographic compartmentalization:** Government/defense compliance (NIST AC-4, ICFY28)
- **Insider threat mitigation:** Orchestrator operators cannot read encrypted context
- **Forensic capabilities:** Confinement ledger enables breach investigation
- **Zero-trust architecture:** Verifiable cryptographic boundaries, not ACL-based trust
- **Competitive moat:** No other MCP implementation has this (OpenAI, Anthropic, LangChain)

### Negative

- **Performance overhead:**
  - Encryption/decryption: ~5ms per capsule
  - zk-proof generation: ~100-200ms (one-time per workflow step)
  - zk-proof verification: ~5-10ms
  - Total: ~10-15% latency increase
- **Complexity:** zk-SNARK circuit design requires cryptographic expertise
- **Key management:** Agents need ephemeral key rotation, secure storage
- **Backward compatibility:** Older agents must upgrade to support capsules

### Neutral

- **Storage overhead:** ~500 bytes per capsule (negligible vs context size)
- **Ledger growth:** ~10MB/day for 10K context handoffs (manageable with partitioning)

### Operational Impact

- **Monitoring:**
  - New metrics: `capsule_encryption_latency_ms`, `zk_proof_generation_latency_ms`, `zk_verification_failures_total`
  - Alert: zk-proof verification failure rate >0.1%
- **Performance:**
  - Target: p99 capsule creation <20ms, verification <10ms
  - Mitigation: Pre-compute zk circuits, cache verification keys
- **Security:**
  - Key rotation policy: Ephemeral keys every 24 hours
  - Circuit audit: External cryptographic review before production
- **Compliance:**
  - Meets NIST SP 800-53 AC-4 (Information Flow Enforcement)
  - Enables FIPS 140-3 certification (if using validated crypto modules)

## Code References

### Core Implementation

- `server/src/conductor/mcp/context-capsule-manager.ts` - Capsule encryption/decryption (new, ~500 lines)
- `server/src/conductor/crypto/zkcontext.ts` - zk-SNARK proving/verification (new, ~300 lines)
- `server/src/conductor/mcp/orchestrator.ts:L234-L289` - Integration with BlackboardContext

### Data Models

- `agents/governance/src/provenance/confinement-ledger.ts` - Ledger schema and queries (new, ~200 lines)
- `migrations/031_create_confinement_ledger.sql` - Database migration

### APIs

- `server/src/conductor/mcp/client.ts:L156-L203` - New MCP methods (`capsule.create`, `capsule.verify`)

## Tests & Validation

### Unit Tests

- `server/src/conductor/crypto/__tests__/zkcontext.spec.ts` - zk-proof generation/verification
  - Test: Valid proof accepted
  - Test: Invalid proof rejected
  - Test: Expired capsule rejected
  - Expected coverage: 95%

### Integration Tests

- `e2e/confinement.spec.ts` - End-to-end context confinement flow
  - Test: Agent A creates capsule for Agent B
  - Test: Agent B verifies and decrypts
  - Test: Agent C (unauthorized) cannot decrypt
  - Test: Revoked capsule rejected

### Evaluation Criteria

- **Performance benchmarks:**
  - Capsule creation: <20ms p99
  - zk-proof verification: <10ms p99
  - Throughput: 1000 capsules/sec on 8-core server
- **Security tests:**
  - Attempt decryption with wrong key (should fail)
  - Attempt to forge zk-proof (should be rejected)
  - Key rotation stress test (10K key changes)

### CI Enforcement

- Golden path test: "E2E context confinement flow"
- Security gate: "Cryptographic audit scan" (detects weak keys, outdated algorithms)

## Migration & Rollout

### Migration Steps

1. **Phase 1 (Month 1):** Implement crypto primitives (X25519, Ed25519, zk-SNARK)
2. **Phase 2 (Month 2):** Build context-capsule-manager, integrate with orchestrator
3. **Phase 3 (Month 3):** Deploy confinement ledger, backward-compatible mode (plaintext fallback)
4. **Phase 4 (Month 4-6):** zk-circuit design, trusted setup ceremony, audit
5. **Phase 5 (Month 7):** Opt-in for pilot customers (FedRAMP High tenants)
6. **Phase 6 (Month 8-12):** Gradual rollout, enforce for all gov/defense tenants

### Rollback Plan

- **Feature flag:** `ENABLE_CRYPTOGRAPHIC_CONFINEMENT=false` disables encryption
- **Backward compatibility:** Orchestrator accepts both encrypted capsules and plaintext context
- **Data migration:** Confinement ledger is append-only (no rollback needed)

### Timeline

- **Phase 1:** Research + prototype (Months 1-3)
- **Phase 2:** Production implementation (Months 4-6)
- **Phase 3:** Pilot + audit (Months 7-9)
- **Completion:** GA for FedRAMP High (Month 12)

## References

### Related ADRs

- ADR-0011: Provenance Ledger Schema (foundation for confinement ledger)
- ADR-0026: Provenance Revocation (revocation mechanism)
- ADR-0029: Confidential MCP Execution with TEEs (complementary hardware-based approach)

### External Resources

- [NIST SP 800-53 AC-4: Information Flow Enforcement](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [Groth16 zk-SNARK](https://eprint.iacr.org/2016/260.pdf) - Efficient zk-proof system
- [snarkjs documentation](https://github.com/iden3/snarkjs) - JavaScript zk-SNARK library
- [X25519 Key Exchange](https://cr.yp.to/ecdh.html) - Elliptic curve Diffie-Hellman

### Discussion

- RFC: "Cryptographic Context Confinement for Zero-Trust MCP" (internal doc, link TBD)
- Security review: External audit by Trail of Bits (planned Q2 2026)

---

## Revision History

| Date       | Author         | Change                                         |
| ---------- | -------------- | ---------------------------------------------- |
| 2026-01-01 | Conductor Team | Initial version (patent defensive publication) |
