# Deterministic Context Compiler Spec (Summit)

## Goal
Transform RetrievalResult -> CompiledContext with:
- deterministic ordering
- dedupe by stable digest
- minimal token footprint
- explicit citations by evidence_id

## Inputs
- RetrievalResult (contract v1)
- CompilerPolicy:
  - token_budget: number
  - per_kind_caps: { chunk: number, entity: number, claim: number, doc: number }
  - excerpt_chars: number (default 800)
  - include_provenance_chain: boolean
  - include_contradictions: boolean
  - sort: "score_desc_then_id" | "id_only"

## Output
CompiledContext JSON matching:
- schemas/graphrag/compiled_context.schema.json

## Determinism Guarantees
- No timestamps
- All arrays stable-sorted by (score desc, evidence_id asc) unless policy overrides
- All string normalization is NFKC + whitespace canonicalization
- Dedupe key: sha256(excerpt_normalized + uri + evidence_id)

## Compilation Algorithm (Normative)
1) Validate RetrievalResult schema
2) Normalize evidence objects (text normalization + truncation)
3) Attach provenance closures if enabled (produced_by, verified_by)
4) Dedupe via stable key; keep highest score, tie-break on evidence_id asc
5) Apply per-kind caps + token budget via deterministic greedy packing:
   - prioritize: verified provenance > corroborated > unverified
   - then: score desc
   - then: evidence_id asc
6) Emit:
   - header: query hash, policy hash, graph_ref
   - evidence_blocks: [ { evidence_id, kind, excerpt, uri, provenance, score } ... ]
   - edge_refs (bounded)
   - compiler_stats (counts, dropped reasons, budget usage)
7) Produce context_digest: sha256(canonical_json)

## Canonical JSON
- UTF-8
- keys sorted lexicographically
- arrays in deterministic order defined above
