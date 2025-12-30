# Policy-Compiled Micro-Indices (PCMI) Implementation Blueprint

This document captures the end-to-end design for **Policy-Compiled Micro-Indices (PCMI)** in Summit/IntelGraph. PCMI precompiles tenant and purpose-aware retrieval indices that already reflect the applicable policy scope, eliminating runtime ACL filtering and reducing governance side channels.

## Goals

- **Deterministic authorization**: Every query executes only over pre-authorized material derived from the caller's policy scope (PSID), preventing leakage via deny-shaped timing.
- **Low-latency retrieval**: Hybrid vector/lexical/graph search runs against small authorized sets to keep p95 and p99 latencies predictable.
- **Auditability and attestation**: Each micro-index ships with a seal that binds the included object set to policy/schema versions.
- **Incremental maintenance**: Support continuous updates via deltas and bounded rebuilds when thresholds are hit.

## Core Concepts

- **Policy Scope ID (PSID)** = `H(tenant, purpose, role_set, attribute_buckets, policy_version, schema_version)`. The PSID canonically identifies the micro-index and aligns user context with precompiled permissions.
- **Subject bucket**: Sorted roles and attribute buckets that capture equivalence classes for policy enforcement and index reuse.
- **Micro-index**: Sealed bundle containing vector-friendly content, lexical representations, graph adjacency restricted to authorized edges, metadata pointers, and a delta log.

## Data Structures

- **Seal**: `{ psid, policyVersion, schemaVersion, objectSetHash, redactionProfile }`.
- **Vector items**: Embeddings for authorized documents and optional nodes.
- **Lexical items**: Tokenizable text surfaces for BM25-style search.
- **Adjacency**: Authorized-only edge map to enable bounded multi-hop expansion without runtime policy checks.
- **Delta log**: Append-only list of inserts/updates/deletes to keep indices fresh between rebuilds.

## Compile Flow

1. **Scope normalization**: Roles and attributes are sorted deterministically before hashing to produce the PSID.
2. **Authorized set resolution**: The policy engine enumerates allowed documents, nodes, and edges with applicable redaction profiles.
3. **Index materialization**:
   - Build vector-friendly representations from embeddings.
   - Build lexical inverted indices from authorized text.
   - Build adjacency maps containing only permitted edges.
4. **Seal**: Compute `objectSetHash` across docs/nodes/edges and persist alongside policy/schema versions.

## Query Flow

1. **PSID lookup**: Derive PSID from `tenant + purpose + subject bucket + policyVersion + schemaVersion` and load the sealed micro-index.
2. **Hybrid search**: Run vector similarity and lexical search within the authorized set, deduplicate, and score.
3. **Bounded traversal**: Expand within adjacency using budgeted hops/expansions to avoid fan-out surprises.
4. **Evidence + audit**: Return top-k evidence plus `{ psid, seal, seed }` for downstream replay.

## Delta Maintenance

- **Apply deltas** for inserts/updates/deletes while refreshing adjacency.
- **Recompute seals** after each delta to preserve attestation integrity.
- **Rebuild triggers** can be tied to delta volume, policy version bumps, or schema changes.

## Observability & Safety Rails

- **Metrics**: PSID hit/miss rates, build latency, query p95/p99, adjacency expansion counts, delta backlog depth.
- **Tracing**: Tag spans with PSID and policy/schema versions; record budget usage and expansions.
- **Alerts**: Cold-path fallback rate spikes, rebuild failure rates, seal mismatches, or query-path timeouts.
- **Audit**: Persist `{ psid, seal, evidence ids, seed }` for replay and compliance evidence.

## Security & Compliance Considerations

- Enforce **policy-as-code**: authorized set derivation must rely solely on the policy engine; no hard-coded bypasses.
- **Side-channel reduction**: Absence of unauthorized items in the micro-index prevents deny-shaped timing artifacts.
- **Redaction**: Apply redaction profiles during materialization; keep seals bound to redaction modes.
- **Isolation**: PSIDs are tenant-scoped and purpose-aware to prevent cross-tenant leakage.

## Rollout Plan

1. **Library integration**: The PCMI primitives live in `server/src/pcmi` for policy scope hashing, micro-index compilation, querying, and delta handling.
2. **Adapter wiring**: Connect the policy engine output to `buildMicroIndex` for authorized object sets; use `queryMicroIndex` inside retrieval services.
3. **Cache strategy**: Store micro-indices by PSID with TTLs keyed to policy and schema versions; warm caches via top-purpose seeds.
4. **Observability hooks**: Emit metrics and audit bundles from the retrieval path; add PSID tags to traces.
5. **Migration**: Run dual-path (cold vs. PCMI) until PSID hit rates exceed thresholds, then retire runtime filtering.

## Future Enhancements

- **Hardware attestation**: Seal micro-indices inside enclaves to harden against tampering.
- **Federated PSIDs**: Support cross-tenant compilations for joint investigations with per-tenant seals.
- **Adaptive bucketing**: Dynamically refine subject buckets based on hit rates to balance reuse vs. index size.
- **Delta compaction**: Periodically compact delta logs into snapshots to bound lookup costs.
