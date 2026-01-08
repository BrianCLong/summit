# ADR-0025: Token-Level Provenance with Attribution Graphs

**Date:** 2026-01-01
**Status:** Proposed
**Area:** AI/ML, Compliance
**Owner:** Provenance Team
**Tags:** provenance, gdpr, privacy, token-attribution, explainability

## Context

Current provenance tracks:

- Inputs (prompts, tools, data sources)
- Outputs (full LLM response text)

**Gap:** Cannot answer "which tokens in output came from which source."

**Why this matters:**

- **GDPR Article 17 (Right to Erasure):** User requests deletion → which outputs contain their data?
- **IP protection:** Which code came from copyrighted training data vs. public domain?
- **Hallucination detection:** Which sentences have source grounding vs. pure generation?
- **Explainability:** "Why did AI recommend this trade?" → trace to specific data sources

**Current limitations:**

- Whole-document provenance (too coarse for deletion compliance)
- LLM self-citation (unreliable, hallucinates references)
- No mechanistic source tracking

## Decision

### Core Decision

Implement **token attribution graphs (TAGs)** that map output token ranges to source context fragments with cryptographic binding and privacy-preserving query interface.

### Key Components

#### 1. Source Tagging

- Every context fragment assigned: `{source_id, type, uri, hash, sensitivity: {pii, ip, confidential}}`
- Example: `{type: "database", uri: "postgres://crm/customers/12345", hash: "sha256:abc", sensitivity: {pii: true}}`

#### 2. Constrained Decoding with Attribution Tracking

- During LLM generation, insert invisible attribution markers every N tokens (N=20): `<|attr:source_id|>`
- Use streaming API to capture partial generations with markers
- Post-process: extract markers, map token ranges to sources

#### 3. Attribution Graph Construction

- Graph: `Source → Token Range → Output`
- Nodes: `{source_id, token_span: [start, end], confidence: 0-1}`
- Edges: `{transformation: "copy"|"paraphrase"|"synthesize"}`
- Confidence from attention weights (high attention to source → high confidence)

#### 4. Privacy-Preserving Query Interface

- **Deletion query:** "Delete all outputs containing PII from source X" → returns token ranges to redact
- **Attribution query:** "What sources contributed to output Y?" → returns graph without exposing private content (only hashes)
- **Sensitivity propagation:** If source is PII, all derived tokens inherit PII label

### Implementation Details

**API:**

```json
{
  "method": "mcp.context.addWithAttribution",
  "params": {
    "content": "Customer Jane Doe purchased...",
    "source": {
      "type": "database",
      "uri": "postgres://crm/customers/12345",
      "hash": "sha256:abc",
      "sensitivity": {"pii": true}
    }
  }
}

{
  "method": "mcp.output.queryAttribution",
  "params": {
    "output_id": "uuid-1234",
    "query": "find_pii_sources"
  },
  "result": {
    "token_ranges": [
      {"span": [10, 18], "source_hash": "sha256:abc", "confidence": 0.92}
    ]
  }
}
```

## Alternatives Considered

### Alternative 1: Document-Level Provenance Only

- **Pros:** Simple, existing SLSA infrastructure
- **Cons:** Cannot answer deletion queries ("which sentence contains PII?")
- **Rejected:** GDPR requires granular deletion (not entire document)

### Alternative 2: LLM Self-Citation

- **Pros:** No engineering (ask LLM to cite sources)
- **Cons:** Unreliable (LLMs hallucinate citations), not cryptographically verifiable
- **Rejected:** Compliance requires mechanistic tracking, not LLM-generated claims

## Consequences

### Positive

- **GDPR/CCPA compliance:** Mechanistic deletion enforcement
- **Explainability:** "This diagnosis came 80% from patient EHR, 20% from medical literature"
- **IP protection:** Identify copyrighted content in generated code
- **Hallucination detection:** Tokens without source grounding flagged

### Negative

- **Storage overhead:** ~1KB per 1000 output tokens
- **Attention weight reliability:** May not perfectly indicate source (LLMs synthesize)
- **Performance:** Graph query latency <100ms (PostgreSQL indexed lookups)

### Operational Impact

- **Compliance:** HIPAA 164.524 (Right of Access), GDPR Art. 17 (Right to Erasure)
- **Monitoring:** Metrics: `attribution_graph_size`, `deletion_query_latency`

## Code References

### Core Implementation

- `server/src/conductor/attribution/tag-builder.ts` (~400 lines)
- `server/src/conductor/attribution/query-engine.ts` (~300 lines)
- `server/src/conductor/llm/attributed-client.ts` (~600 lines) - Streaming API wrapper

### Data Models

- `migrations/033_create_attribution_graphs.sql`:
  ```sql
  CREATE TABLE attribution_graphs (
    output_id UUID,
    source_id TEXT,
    token_start INT,
    token_end INT,
    confidence FLOAT,
    created_at TIMESTAMPTZ
  );
  CREATE INDEX idx_attribution_output ON attribution_graphs(output_id);
  CREATE INDEX idx_attribution_source ON attribution_graphs(source_id);
  ```

## Tests & Validation

### Evaluation Criteria

- **Accuracy:** >80% attribution precision on benchmark datasets (manual labeling)
- **Performance:** Deletion propagation <5s for 10K affected outputs
- **Privacy:** Query interface never exposes raw source content (only hashes)

### CI Enforcement

- Golden path test: "Token attribution E2E flow"
- Privacy test: "Deletion query redacts PII tokens"

## Migration & Rollout

### Timeline

- Phase 1: Attributed LLM client (Months 1-3)
- Phase 2: Graph storage + query engine (Months 4-6)
- Phase 3: Policy integration (Months 7-9)
- Completion: GA for healthcare/finance (Month 12)

## References

### Related ADRs

- ADR-0011: Provenance Ledger Schema
- ADR-0026: Provenance Revocation (complementary invalidation mechanism)

### External Resources

- [GDPR Article 17: Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [HIPAA Right of Access](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/access/)

---

## Revision History

| Date       | Author          | Change                                         |
| ---------- | --------------- | ---------------------------------------------- |
| 2026-01-01 | Provenance Team | Initial version (patent defensive publication) |
