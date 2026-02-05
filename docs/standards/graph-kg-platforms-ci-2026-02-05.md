# Graph-KG Platforms CI 2026-02-05 (Competitive Intel Standard)

## Readiness Assertion

This standard is governed by `docs/SUMMIT_READINESS_ASSERTION.md` and the Law of Consistency.

## Scope

- Daily competitive intel tracking for TigerGraph, AWS Neptune, and market convergence on GraphRAG.
- Backend-agnostic hybrid retrieval contract for graph + vector evidence.
- Deterministic evidence artifacts for GraphRAG benchmarks.

## Non-Goals

- No infrastructure provisioning for Neptune or TigerGraph.
- No re-implementation of vendor query languages.
- No parity claims without benchmark evidence.

## Ground Truth (Evidence-First)

- **GRAPHKG.CLAIM.01** — TigerGraph defines Hybrid Search as merging graph traversal with vector embedding search and supporting native vector search in a single system. Source: TigerGraph blog (Hybrid Search) [tigergraph.com/blog/tigergraph-hybrid-search-graph-and-vector-for-smarter-ai-applications](https://www.tigergraph.com/blog/tigergraph-hybrid-search-graph-and-vector-for-smarter-ai-applications/?utm_source=chatgpt.com).
- **GRAPHKG.CLAIM.02** — TigerGraph states Hybrid Search is available in TigerGraph DB Community Edition (free). Source: TigerGraph blog (Hybrid Search) [tigergraph.com/blog/tigergraph-hybrid-search-graph-and-vector-for-smarter-ai-applications](https://www.tigergraph.com/blog/tigergraph-hybrid-search-graph-and-vector-for-smarter-ai-applications/?utm_source=chatgpt.com).
- **GRAPHKG.CLAIM.03** — AWS Neptune Analytics GA includes 7 additional regions and supports graph analytics operations. Source: AWS What’s New (2026-01-22) [aws.amazon.com/about-aws/whats-new/2026/01/amazon-neptune-analytics-generally-available-additional-regions](https://aws.amazon.com/about-aws/whats-new/2026/01/amazon-neptune-analytics-generally-available-additional-regions/).
- **GRAPHKG.CLAIM.04** — AWS Neptune position includes fully managed GraphRAG with Bedrock Knowledge Bases plus agent tooling integrations. Source: AWS What’s New (2026-01-22) [aws.amazon.com/about-aws/whats-new/2026/01/amazon-neptune-analytics-generally-available-additional-regions](https://aws.amazon.com/about-aws/whats-new/2026/01/amazon-neptune-analytics-generally-available-additional-regions/).
- **GRAPHKG.CLAIM.05** — AWS Neptune Graph and AI page frames GraphRAG to improve accuracy, states Bedrock Knowledge Bases use Neptune, and references a GraphRAG toolkit. Source: AWS Neptune Graph and AI page [aws.amazon.com/neptune/graph-and-ai](https://aws.amazon.com/neptune/graph-and-ai/).
- **GRAPHKG.CLAIM.06** — AIM MarketView (2026) highlights convergence on GraphRAG, vector–graph integration, and graph-based reasoning architectures. Source: AIM Research MarketView (2026-01-09) [aimresearch.co/product/aim-marketview-graph-databases-2026](https://aimresearch.co/product/aim-marketview-graph-databases-2026).
- **GRAPHKG.CLAIM.07** — Neo4j Community Edition is GPLv3 and Enterprise requires a commercial license. Source: Neo4j GitHub README [github.com/neo4j/neo4j](https://github.com/neo4j/neo4j).

## Claim Registry (Summit Elements)

| Summit element | Evidence IDs |
| --- | --- |
| Hybrid Retrieval contract (graph traversal + vector similarity) | GRAPHKG.CLAIM.01, GRAPHKG.CLAIM.06 |
| Backend capability matrix | GRAPHKG.CLAIM.03, GRAPHKG.CLAIM.04, GRAPHKG.CLAIM.05, GRAPHKG.CLAIM.06, GRAPHKG.CLAIM.07 |
| Neptune managed GraphRAG mode (Bedrock KB adapter) | GRAPHKG.CLAIM.04, GRAPHKG.CLAIM.05 |
| TigerGraph adapter placeholder + contract tests | GRAPHKG.CLAIM.01, GRAPHKG.CLAIM.02 |
| Bench harness evidence artifacts | Summit original (evidence-driven) |

## Minimal Winning Slice (MWS)

Add a backend-agnostic Hybrid Retrieval contract, Neptune managed GraphRAG adapter, and deterministic benchmark artifacts to prove quality/latency deltas.

Acceptance tests:

- `pnpm test` includes HybridRetriever contract tests (mock graph + vector).
- `pnpm summit:bench graphrag --profile=mws` writes `report.json`, `metrics.json`, `stamp.json` (no timestamps).
- Feature flag `graphrag.neptuneManaged` defaults OFF.
- Documentation claims are mapped to Evidence IDs.

## Backend Capability Matrix (Deterministic)

| Backend | Graph traversal | Vector search | Hybrid search (native) | Managed GraphRAG | Agent integrations | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Neo4j | Yes | External | No | No | No | Commercial license applies for Enterprise. |
| AWS Neptune (Managed GraphRAG) | Yes | Yes | No | Yes | Yes | Bedrock KB managed mode; feature flag required. |
| TigerGraph | Yes | Yes | Yes | No | No | Native graph + vector hybrid search. |

## Import / Export Matrix

| Category | Inputs | Outputs |
| --- | --- | --- |
| Documents | Text, entity triples, embeddings | Evidence JSON, answer packets |
| Graph | Nodes, edges, traversal intents | Citations, audit logs |
| Retrieval | Queries, filters, budgets | Ranked candidates, metrics |

## Evidence Artifacts

Bench evidence MUST be deterministic and include:

- `artifacts/bench/graphrag/<profile>/report.json`
- `artifacts/bench/graphrag/<profile>/metrics.json`
- `artifacts/bench/graphrag/<profile>/stamp.json` (no timestamps; git sha + config hash only)

## Positioning Constraints (vs Neo4j)

- Summit claims backend-agnostic GraphRAG pipelines with deterministic evidence.
- Summit does not claim parity with TigerGraph native hybrid search without benchmarks.
- Summit does not claim exclusivity in managed GraphRAG positioning.

## MAESTRO Alignment

- **Layers**: Foundation, Data, Agents, Tools, Observability, Security
- **Threats Considered**: prompt injection, retrieval exfiltration, evidence tampering
- **Mitigations**: deny-by-default retrieval policy, evidence budgets, deterministic artifacts
