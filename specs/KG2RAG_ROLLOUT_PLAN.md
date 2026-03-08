# KG²RAG Rollout Plan

This document outlines the engineering plan to deliver the KG²RAG capability.

## 🏁 Phase 0: Foundation (Week 0)
**Goal:** Prepare the codebase and infrastructure for graph-augmented retrieval without disrupting existing flows.

### Epic 1: Schema & Infrastructure
*   **PR 1.1:** [Infra] Add `KG2RAG_ENABLED` feature flag to `feature_flags.json`.
*   **PR 1.2:** [Graph] Extend Neo4j Schema to support `EvidencePath` metadata (confidence, provenance).
*   **PR 1.3:** [Specs] Commit `KG2RAG_IMPLEMENTATION_PRD.md` and `KG2RAG_ROLLOUT_PLAN.md`.

### Epic 2: Interfaces
*   **PR 2.1:** [Core] Define `EvidencePath` and `RetrievalResult` interfaces in `packages/sdk`.
*   **PR 2.2:** [Core] Create `KG2RAGRetriever` abstract base class / interface.

## 🚧 Phase 1: Implementation (Week 1)
**Goal:** Functional "Walking Skeleton" of the KG²RAG pipeline.

### Epic 3: Retrieval Engine
*   **PR 3.1:** [Retriever] Implement Qdrant vector lookup stub in `KG2RAGRetriever`.
*   **PR 3.2:** [Retriever] Implement Neo4j multi-hop expansion logic (using `nl2cypher` patterns).
*   **PR 3.3:** [Retriever] Fuse Vector + Graph results into `RetrievalResult`.

### Epic 4: Observability
*   **PR 4.1:** [Observer] Add telemetry hooks for "Retrieval Delta" and "Hop Entropy".
*   **PR 4.2:** [Audit] Wire `EvidencePath` generation to `HashChainLedger`.

## 🔬 Phase 2: Validation & Tuning (Week 2)
**Goal:** Prove superiority over baseline and optimize.

### Epic 5: Benchmarking
*   **PR 5.1:** [Bench] Create comparison harness (Golden Dataset vs. KG²RAG vs. Baseline RAG).
*   **PR 5.2:** [Tuning] Expose weighing parameters (Semantic vs. Graph score) via config.

### Epic 6: API Exposure
*   **PR 6.1:** [API] Expose `KG2RAG` via GraphQL Resolver.
*   **PR 6.2:** [Docs] Update SDK documentation with "Evidence Object" usage.

## 🚀 Phase 3: Release (Post-Week 2)
*   **Action:** Enable Feature Flag for internal dogfooding.
*   **Action:** Review Observer metrics for performance regression.
*   **Action:** GA Release.
