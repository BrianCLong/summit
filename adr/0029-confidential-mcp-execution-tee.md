# ADR-0029: Confidential MCP Execution with Trusted Execution Environments

**Date:** 2026-01-01
**Status:** Proposed
**Area:** Infrastructure, Auth/Security, Compliance
**Owner:** Infrastructure Team
**Tags:** confidential-computing, tee, sgx, sev, multi-tenancy, hardware-security

## Context

Summit's multi-tenant MCP deployment shares infrastructure across tenants:
- MCP servers
- Orchestrator instances
- Model inference infrastructure
- Memory, CPU, caches

**Attack vectors in multi-tenant clouds:**
- **Cache timing attacks:** Tenant A infers Tenant B's prompts via shared CPU cache
- **Memory residuals:** Context from Tenant A leaks to Tenant B after deallocation
- **Model contamination:** Fine-tuning for Tenant A affects Tenant B's outputs
- **Malicious operator:** Cloud admin with root access reads tenant context

**Current defenses (insufficient for highest security tiers):**
- Query-scoped isolation (PostgreSQL RLS) - protects database, not in-memory processing
- Process isolation (containers) - doesn't protect against privileged insider
- Encryption at rest/transit - context is plaintext during processing

**Business drivers:**
- **FedRAMP High:** Requires hardware-enforced isolation (FIPS 140-3)
- **DoD IL5+:** Requires Trusted Execution Environments
- **Swiss Banking:** Confidential computing mandates (FINMA regulations)
- **Premium pricing:** Charge 2-3x for confidential tier

## Decision

### Core Decision

Implement **hardware-enforced confidential computing** using Trusted Execution Environments (TEEs) for multi-tenant MCP context processing.

### Key Components

#### 1. Confidential Context Enclaves
- Each MCP server runs in TEE:
  - **Intel SGX** (Software Guard Extensions)
  - **AMD SEV-SNP** (Secure Encrypted Virtualization)
  - **ARM TrustZone**
- **Enclave properties:**
  - Memory encrypted with tenant-specific key
  - CPU registers cleared on context switch
  - No debugger/root access (even cloud admin cannot inspect)

#### 2. Remote Attestation Protocol
- Before sending context to MCP server, client verifies enclave:
  - Request **attestation quote:** cryptographic proof of enclave code
  - Quote: `{code_hash, data_hash, cpu_svn, timestamp, signature}`
  - Verify signature against CPU manufacturer's root key (Intel/AMD)
  - Check: "Is this the correct MCP server version? Any patches/vulnerabilities?"
- Only send context if attestation valid (and recent <5min)

#### 3. Sealed Storage
- Enclave encrypts context before writing to disk:
  - **Sealing key** derived from enclave identity + CPU fused key
  - Encrypted blobs can only be decrypted by same enclave version on same CPU
- **Prevents:**
  - Disk forensics by cloud admin
  - Migration to untrusted environment

#### 4. Secure Multi-Party Computation for Aggregation
- If orchestrator needs aggregate stats ("average response time across all tenants"):
  - **Homomorphic encryption:** Compute on encrypted data
  - **Or secure enclaves with differential privacy:** Add noise before leaving enclave
- Never expose individual tenant data

#### 5. Enclave-Based Policy Enforcement
- OPA policy engine runs *inside enclave*
- Policy decisions on encrypted context (never leaves TEE)
- Audit logs sealed before writing to untrusted storage

### Implementation Details

**Enclave Lifecycle:**
```
1. Server boots → initialize SGX/SEV enclave → generate ephemeral keys
2. Client requests attestation → enclave provides quote
3. Client verifies quote → trusts enclave → sends encrypted context
4. Enclave processes context → seals output → returns to client
5. Client unseals with tenant key
```

**API:**
```json
{
  "method": "mcp.enclave.requestAttestation",
  "params": {
    "nonce": "random_challenge"
  },
  "result": {
    "attestation_quote": "base64_sgx_quote",
    "enclave_code_hash": "sha256:...",
    "cpu_svn": 15,
    "timestamp": "2026-01-01T12:00:00Z",
    "signature": "base64_sig"
  }
}

{
  "method": "mcp.context.submitSealed",
  "params": {
    "sealed_context": "encrypted_with_enclave_pubkey",
    "tenant_id": "tenant-123"
  }
}
```

**Performance:**
- Attestation overhead: ~200ms (one-time per connection)
- Enclave processing: ~10-20% slower than native (encryption overhead)
- Sealed storage I/O: ~2x slower (encryption)

## Alternatives Considered

### Alternative 1: Software-Only Encryption (No TEE)
- **Pros:** No hardware dependency, cloud-portable
- **Cons:** Operators can access encryption keys in memory
- **Rejected:** Doesn't meet FedRAMP High hardware isolation requirement
- **Note:** This is addressed by ADR-0023 (Cryptographic Context Confinement) as complementary

### Alternative 2: Dedicated Hardware per Tenant
- **Pros:** Perfect isolation
- **Cons:** Prohibitively expensive (100x cost), poor utilization
- **Rejected:** Not economically viable for cloud SaaS

### Alternative 3: Fully Homomorphic Encryption (FHE)
- **Pros:** Strongest confidentiality (compute on encrypted data)
- **Cons:** 100-1000x performance overhead, can't run LLMs
- **Rejected:** Research-grade, not production-ready for LLMs

## Consequences

### Positive
- **Hardware-enforced isolation:** Military-grade confidentiality
- **Insider threat mitigation:** Cloud admins cannot read encrypted context (even with root)
- **Attestation:** Cryptographic proof that code is unmodified
- **Compliance:** FedRAMP High, DoD IL5+, FIPS 140-3 certification path
- **Premium pricing:** Justify 2-3x pricing for confidential tier

### Negative
- **Hardware dependency:** Requires Intel Xeon E-series (Ice Lake+) or AMD EPYC with SEV-SNP
  - Limits cloud portability (not all regions have SGX/SEV)
- **Enclave memory limits:** 512MB-256GB (depending on CPU)
  - May not fit large contexts (need chunking)
- **Performance overhead:** 10-20% slower processing, 2x slower disk I/O
- **Complexity:** Enclave development requires specialized expertise (Gramine, SGX SDK)
- **Maintenance:** CPU microcode updates may break enclaves (need careful patch management)

### Operational Impact
- **Monitoring:**
  - Metrics: `enclave_attestation_failures`, `sealed_storage_latency`, `enclave_memory_usage`
  - Alert: Attestation failure rate >0.1%
- **Performance:**
  - Target: p99 attestation <250ms, enclave processing overhead <20%
- **Security:**
  - Key rotation: Ephemeral keys every 24 hours
  - Enclave code audit: External review (Trail of Bits) before production
- **Compliance:**
  - NIST SP 800-53 AC-4 (Information Flow Enforcement)
  - FIPS 140-3 Level 3 (if using validated SGX modules)
  - FedRAMP High (hardware isolation requirement)

## Code References

### Core Implementation
- `services/mcp-server-sgx/enclave/` (~3000 lines C++) - Enclave code
  - Entry points: `ecall_process_context()`, `ecall_seal_output()`
  - Sealing/unsealing logic
  - Attestation quote generation
- `services/attestation-verifier/` (~500 lines Rust) - Quote verification
- `server/src/conductor/mcp/attestation-client.ts` (~400 lines) - Client-side attestation

### Data Models
- No new database tables (enclave state is ephemeral)
- Sealed blobs stored in S3/Minio (opaque to database)

### Infrastructure
- `docker-compose.mcp-sgx.yml`:
  ```yaml
  services:
    mcp-server-sgx:
      image: summit/mcp-server-sgx:latest
      devices:
        - /dev/sgx # SGX device passthrough
      environment:
        - SGX_MODE=HW
        - ATTESTATION_SERVICE=https://api.trustedservices.intel.com
  ```

## Tests & Validation

### Evaluation Criteria
- **Security:**
  - Attempt to read enclave memory with debugger (should fail)
  - Attempt to decrypt sealed storage without enclave (should fail)
  - Key extraction attack (should be prevented by CPU)
- **Performance:**
  - Attestation: <250ms p99
  - Processing overhead: <20%
  - Sealed I/O: <2x native

### CI Enforcement
- **Simulation mode:** Unit tests run with SGX_MODE=SIM (software emulation)
- **Hardware tests:** Integration tests on SGX-enabled CI runners (dedicated hardware)
- **Golden path:** "E2E confidential context processing with attestation"

## Migration & Rollout

### Migration Steps
1. **Phase 1 (Months 1-3):** Research + prototype (SGX SDK, Gramine LibOS evaluation)
2. **Phase 2 (Months 4-6):** Enclave development (core MCP logic port to C++)
3. **Phase 3 (Months 7-9):** Attestation service integration (Intel Attestation Service, Azure Attestation)
4. **Phase 4 (Months 10-12):** Performance optimization (reduce overhead to <20%)
5. **Phase 5 (Months 13-15):** Security audit (external review, FIPS certification)
6. **Phase 6 (Months 16-18):** Pilot with FedRAMP High customers

### Rollback Plan
- **Dual deployment:** Run both confidential and standard MCP servers
- **Tenant opt-in:** Confidential tier is premium feature (not mandatory)
- **No data migration:** Sealed storage is new (doesn't affect existing provenance)

### Timeline
- **Research:** Months 1-6
- **Development:** Months 7-12
- **Pilot:** Months 13-15
- **GA:** Month 18 (FedRAMP High customers only)

## References

### Related ADRs
- ADR-0010: Multi-Tenant Compartment Model (tenant isolation foundation)
- ADR-0023: Cryptographic Context Confinement (software-based alternative)

### External Resources
- [Intel SGX](https://www.intel.com/content/www/us/en/architecture-and-technology/software-guard-extensions.html)
- [AMD SEV-SNP](https://www.amd.com/en/developer/sev.html)
- [Gramine LibOS](https://gramineproject.io/) - Run unmodified applications in SGX
- [Azure Confidential Computing](https://azure.microsoft.com/en-us/solutions/confidential-compute/)
- [NIST SP 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [FedRAMP High Baseline](https://www.fedramp.gov/assets/resources/documents/FedRAMP_High_Security_Controls.xlsx)

### Discussion
- Internal RFC: "TEE Strategy for Summit" (link TBD)
- External audit: Trail of Bits security review (planned)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-01-01 | Infrastructure Team | Initial version (patent defensive publication) |
