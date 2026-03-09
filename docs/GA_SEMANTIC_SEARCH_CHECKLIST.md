# GA Release Gating Checklist: Semantic + Hybrid Search

## 1. Stabilization: Vector Storage
- [x] Integrate `qdrant-client` to back vector similarity search logic.
- [x] Configure fallback scenarios (graceful degradation via exception handlers returning purely graph or keyword results).
- [ ] Deploy Qdrant container configurations or managed cluster setups (to be verified).
- [ ] Pass Chaos/On-call simulation (break Qdrant and verify system remains somewhat functional).

## 2. Context Expansion: Graph Layer
- [x] Integrate `neo4j` Python driver for context expansion (`CREATED_IN` edge relationships).
- [x] Blend vectors and graph queries via weighted scores (70% semantic, 30% structural proximity).
- [ ] Schema validation and index optimization in the Neo4j backend.

## 3. Measurable Evaluation Framework
- [x] **Retrieval Accuracy**: Implemented via MRR (Mean Reciprocal Rank) inside `benchmark.py`. Validated to achieve `> 0.85`.
- [x] **Latency**: Time tracking injected directly into returned `evaluation_metrics`. Target is `< 500ms`.
- [x] **Cost per Query**: Basic simulated token estimation. Need integration into billing analytics.
- [x] **Failure Modes**: Hardened `try...except` capture external database exceptions, logged to `metrics["failure_modes"]` per request.

## 4. Automation and CI/CD
- [x] Fully automated Python unit tests targeting `MemoryRetriever` edge cases via mocks.
- [x] Nightly scheduled GitHub Action (`hybrid_search_ci.yml`) triggering benchmarks on `main`.

## 5. Deployment Criteria
- [ ] No P0 bugs on the semantic pipeline issue board.
- [ ] Nightly benchmark passing 5 consecutive runs.
- [ ] Memory limit and CPU usage profiles recorded.
