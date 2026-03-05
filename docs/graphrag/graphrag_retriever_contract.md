# GraphRAG Retriever Contract (Summit)

## Purpose
Define the required shape, determinism rules, and safety constraints for any retriever used to supply evidence context to LLMs.

This contract separates:
- Retrieval: selecting candidate evidence/subgraph
- Compilation: producing deterministic prompt-ready context
- Evaluation: scoring retrieval + generation quality

## Definitions
- Seed: initial nodes/records returned by lexical/vector search
- Expansion: bounded traversal (k-hop, typed) to add related nodes
- Evidence Object: minimal, stable record used for grounding/citations

## Hard Requirements (MUST)
### 1) Determinism
Retriever output MUST be identical for identical inputs and graph snapshot:
- No timestamps, random UUIDs, or nondeterministic ordering
- Stable sort order is REQUIRED on all arrays
- Stable hashing is REQUIRED for ids/digests where applicable

### 2) Boundedness
- Traversal MUST have explicit max depth (default: 2)
- Traversal MUST have explicit max nodes/edges caps
- Query MUST have timeouts and max row limits

### 3) Safety
- Text2Cypher is DISALLOWED in default mode.
- If enabled explicitly, it MUST be:
  - read-only principal
  - allowlisted query templates OR strict schema-constrained generation
  - EXPLAIN required prior to execution and blocked on high-cost plans

### 4) Minimal Return Shape
Retriever MUST return “Evidence Objects” (not whole nodes):
- id, type, excerpt window, source uri, digests, provenance links

## Retriever IO

### Inputs
- query: string
- policy:
  - seed: { mode: "hybrid"|"vector"|"lexical", topK: number }
  - expand: { depth: number, edgeAllowlist: string[], capNodes: number, capEdges: number }
  - rank: { method: "bm25"|"cosine"|"rerank", topK: number }
  - provenance: { requireVerifiedChain: boolean, minCorroboration: number }
- snapshot:
  - graph_ref: string (commit-like identifier or Neo4j tx bookmark)
  - index_ref: string (vector index version)

### Output (RetrievalResult)
Retriever MUST output JSON matching:
- schemas/graphrag/retrieval_result.schema.json

Key fields:
- request: { query_hash, policy_hash, graph_ref }
- seeds: EvidenceObject[]
- expanded: EvidenceObject[]
- edges: EdgeRef[]
- stats: { timings_ms, counters, cypher: { query_hashes[], plan_summaries[] } }
- deterministic: { normalized: true, sort_keys: [...], stable_hash_algo: "sha256" }

## Evidence Object (Minimum)
- evidence_id: stable string
- kind: "chunk"|"entity"|"claim"|"doc"|"run"|"source"
- title: string?
- excerpt: string (bounded length)
- uri: string?
- digest: { sha256: string }
- provenance:
  - produced_by_run_id?: string
  - verified_by_run_ids?: string[]
  - source_ids?: string[]
- citations: { start: number, end: number }[]?

## Normalization Rules
- Unicode NFKC
- Trim + collapse internal whitespace to single spaces
- Newlines normalized to "\n"
- Excerpts hard-capped (default 800 chars) with deterministic truncation

## Failure Modes (MUST surface)
- timeout
- cap_exceeded
- unsafe_query
- invalid_schema
- empty_result

## Versioning
Contract version: v1
Any breaking change increments major.
