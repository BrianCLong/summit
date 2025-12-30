# Policy-Compiled Micro-Indices (PCMI) Architecture

## Purpose and scope

PCMI turns policy-scoped retrieval requirements into compiled micro-indices that enforce guardrails at build time (ingest/compile) and at query time. This document covers PSID computation, micro-index structure (vector/lexical/graph), compile/query flows, delta maintenance, audit/attestation, and the migration plan to integrate PCMI into existing Summit retrieval and policy pipelines.

## Key concepts

- **PSID (Policy-Scoped Identifier):** Deterministic identifier representing the tuple of policy context, data asset lineage, and index-time configuration. PSIDs gate index compilation and lookup.
- **Micro-index:** Fine-grained, policy-bound index bundle comprising vector, lexical, and graph components plus policy filters and attestation metadata.
- **Compile-time enforcement:** Policies are compiled into filters, embeddings constraints, and structural guards before materializing micro-indices.
- **Query-time enforcement:** Queries resolve to PSIDs, then dispatch only to micro-indices whose attestations satisfy runtime policy checks.

## PSID computation

1. **Inputs:**
   - Policy bundle digest (OPA/Rego package hash + version + signing key id).
   - Data scope fingerprint (dataset id, schema version, tenant, sensitivity labels, lineage anchors, checksum of normalized records).
   - Index recipe (embedding model id, tokenization config, lexical analyzer, graph projection, dimension reductions, sharding params).
   - Environment & build metadata (cluster, region, compiler version, feature flags).
2. **Process:**
   - Normalize inputs, encode as canonical JSON, then compute SHA-256.
   - Construct PSID as `pcmi::<policy_hash>::<data_hash>::<recipe_hash>::<env_hash>`.
   - Sign PSID manifest with provenance ledger key; store in attestation store.
3. **Properties:**
   - Deterministic and replayable across clusters.
   - Encodes blast radius for invalidation—changing any input yields a new PSID.
   - Compatible with existing provenance-ledger events (PSID attached to `IndexCompiled` and `IndexQueried`).

## Micro-index structure

Each micro-index is a self-describing bundle:

- **Vector shard:**
  - Embedding matrix with PSID-bound model id, dimensionality, and quantization parameters.
  - Optional ANN graph (HNSW/IVF) constrained by per-policy neighbor caps and distance metrics.
  - Feature masks enforcing attribute-level filtering (e.g., classification labels, tenant).
- **Lexical shard:**
  - BM25/PL2 inverted index with policy-filtered term dictionary and stopword set.
  - Payloads store doc id, field mask, sensitivity tags, TTL, and checksum.
- **Graph projection:**
  - Policy-pruned subgraph (Neo4j/Janus schema) with typed nodes/edges and access labels.
  - Projection metadata lists allowed traversals and max hop depth per policy.
- **Shared components:**
  - **Routing table:** maps query intents to shard selectors and fallback order (vector → lexical → graph, configurable).
  - **Policy filter plan:** compiled Rego-to-SQL/Gremlin predicates for pre/post filters.
  - **Attestation block:** PSID, signatures, compile timestamp, artifact digests, SBOM pointer, and build agent identity.
  - **Delta log pointer:** offset in the provenance stream for incremental rebuilds.

## Compile flow

1. **Policy intake:** Fetch policy bundle; validate signature; compute `policy_hash`.
2. **Data scan:** Run lineage + schema fingerprint; derive `data_hash` and sensitivity labels.
3. **Recipe selection:** Choose index recipe (models, analyzers, projections) per policy + tenant profile; hash to `recipe_hash`.
4. **PSID manifest:** Combine hashes + env metadata; compute PSID; sign manifest.
5. **Materialization:**
   - Vector: embed, apply label masking, build ANN index with policy neighbor caps.
   - Lexical: tokenize with policy stopword/normalization rules; build inverted index.
   - Graph: project policy-pruned graph and enforce traversal caps.
6. **Bundle & attest:** Package shards + policy filter plan + routing table; attach attestation block; emit `IndexCompiled{psid}` event to provenance ledger.

## Query flow

1. **Context resolution:** Derive PSID for the caller’s policy context (policy version, tenant, data scope, recipe hints). Reject if PSID missing attestation.
2. **Policy gate:** Evaluate runtime policy (OPA) with PSID manifest and query claims (subject, purpose, classification). If fails, short-circuit with audit log.
3. **Routing:** Select shard order from routing table. Example default: vector → lexical fallback → graph expansion for entity joins.
4. **Execution:**
   - Vector: ANN search with label-aware prefilter; apply policy filter plan post-search.
   - Lexical: constrained query with Rego-compiled filters (e.g., row-level constraints) and TTL checks.
   - Graph: traversal limited by projection metadata; enforce hop and fanout caps.
5. **Result shaping:** Merge/rerank with policy-aware scorer (can downweight stale/low-attestation results). Attach PSID + attestation hash to response for downstream auditing.
6. **Audit:** Emit `IndexQueried{psid}` with subject, purpose, filters applied, result set hash.

## Delta maintenance

- **Change detection:** Subscribe to provenance/CDC stream; compute diff against `delta log pointer` per PSID.
- **Incremental rebuild:**
  - Vector: re-embed changed docs; patch ANN index (upsert/delete); recompute shard checksum.
  - Lexical: update inverted lists; recalc term stats under policy stopword set.
  - Graph: apply edge/node mutations in policy-pruned projection; re-evaluate traversal caps.
- **Invalidation triggers:** policy bundle change, recipe change, sensitivity relabel, or attestation expiry → rotate PSID, emit `IndexInvalidated` and recompile.
- **Backfill guardrails:** throttle rebuilds per tenant; enforce isolation domains to prevent cross-PSID contamination.

## Audit and attestation

- **Attestation content:** PSID manifest, signatures, SBOM digest, build inputs, compiler version, feature flags, source commit hash.
- **Storage:** Immutable provenance ledger + append-only attestation store (S3/GCS with object lock) keyed by PSID.
- **Verification:**
  - Compile-time: verify signatures and SBOM before activation.
  - Query-time: enforce freshness (TTL), signature validity, and revocation list checks.
- **Reporting:** Generate audit trails per PSID with compile/query events, deltas applied, and policy decisions; export to SOC2/ISO evidence bundles.

## Implications for existing systems

- **Retrieval services:**
  - Add PSID resolution step before hitting vector/lexical stores.
  - Update rerankers to accept PSID + attestation metadata for scoring features.
  - Introduce shard routing plugin driven by micro-index routing tables.
- **Policy evaluation:**
  - Extend OPA bundles with PSID manifest schema; add Rego helpers for attestation checks.
  - Enforce policy version pinning per request to avoid silent drift.
- **Indexing pipelines:**
  - Modify ingestion to emit lineage fingerprints and sensitivity labels required for PSID computation.
  - Add compile stage that materializes micro-indices and writes attestation blocks.
  - Wire delta processor to provenance/CDC feed with PSID-aware rebuild logic.

## Migration and rollout plan

1. **Design + RFC (current):** Publish PCMI architecture and align with policy team; socialize PSID schema.
2. **Pilot (shadow compile):**
   - Enable PSID computation and attestation without switching query routing; validate hashes and lineage coverage.
   - Backfill attestation store for top-10 datasets.
3. **Dual-run:**
   - Build micro-indices in parallel with existing indices; mirror queries to measure parity.
   - Compare recall/latency; tune routing tables and filter plans.
4. **Progressive cutover:**
   - Tenant-by-tenant enablement flag; start with low-risk tenants.
   - Fail-closed policy gate for PSID mismatches after confidence reaches SLO target.
5. **Decommission legacy paths:**
   - Remove direct index access; enforce PSID gate globally.
   - Delete stale indices lacking attestations; lock old pipelines.
6. **Operational readiness:**
   - Add dashboards for PSID compile/query volume, attestation freshness, and rebuild lag.
   - Run game days for invalidation/rotation, attestation failure, and policy rollback.

## Forward-looking enhancements

- Deterministic proof-carrying retrieval responses (Merkle proofs over shard payloads) for tamper-evident attestations.
- Adaptive recipe selection using online learning to pick vector/lexical weights per policy intent while preserving PSID determinism via constrained candidate sets.
- Secure enclaves for compilation to bind PSID attestation to hardware roots of trust.
