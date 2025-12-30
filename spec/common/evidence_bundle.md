# Evidence Capsule / Bundle

**Purpose:** Portable evidence artifact with privacy-aware payloads and verifiable pointers.

**Structure**

- Redacted bytes for sensitive content (policy-enforced).
- Stable pointers (URI + content-addressed hash) to full records.
- Policy decision token(s) binding subject, purpose, and permitted effects.
- Provenance references (source identifiers, ingestion timestamps).
- Optional cryptographic commitments (Merkle roots) over item identifiers.

**Behavioral Notes**

- Bundles are signed by the producing service; downstream services validate signatures before use.
- Redaction policy and provenance metadata must survive transformation; carry forward the hash chain in the witness chain.
- Use deterministic serialization to ensure stable hashes across services.
