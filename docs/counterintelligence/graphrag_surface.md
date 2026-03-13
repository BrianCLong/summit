# GraphRAG Counterintelligence Surface Map

## Overview
This document maps Summit's GraphRAG-aware surfaces to identify and mitigate counterintelligence (CI) risks, specifically graph poisoning and adversarial narrative manipulation.

## Summit GraphRAG Surface

Summit utilizes several modules to build and maintain narrative and knowledge graphs:

- **Schema Definition**: `intelgraph/schema/canonical_types.py` defines foundational entity types (e.g., `Narrative`, `Actor`, `Claim`) and relationship types (e.g., `AMPLIFIED_VIA`, `TARGETED`, `COORDINATED_WITH`).
- **Graph Modeling**: `summit/graph/` contains core graph abstractions and builders (e.g., `summit/graph/model.py`, `summit/graph/builders/coshare.py`) used to construct network representations of actor behavior.
- **Retrieval & API**: `services/graphrag_api/` (e.g., `services/graphrag_api/routes/chat.py`) provides the interface for graph-based retrieval and multi-hop reasoning.
- **GraphRAG Implementation**: `src/graphrag/` contains the logic for context compilation (`src/graphrag/context-compiler/`), graph querying (`src/graphrag/core/graph-query.ts`), and evidence processing.

## Graph Elements and Flows

Using GraphRAG-aligned language, Summit's graph components map as follows:

- **Nodes**:
  - **Actors**: Identified entities (individuals, groups, accounts) found in `intelgraph/schema/canonical_types.py`.
  - **Narratives**: High-level semantic clusters managed via `summit/cbm/narratives.py`.
  - **Events/Claims**: Atomic observations or assertions recorded in `intelgraph/core/models.py` (Claim/Entity).
- **Edges/Relations**:
  - **Supports/Contradicts**: Epistemic relations between claims and narratives.
  - **Amplifies/Targets**: Behavioral relations between actors and content/entities.
  - **Co-shares/Crossposts**: Infrastructure-level relations identifying coordination, handled in `summit/graph/builders/coshare.py`.
- **Communities/Clusters**:
  - Multi-scale narrative communities detected via clustering logic in `summit/cbm/narratives.py`.
  - These communities are summarized to provide global query context and drive scoring in `services/graphrag_api/`.

## Poisoning and Adversarial Risks

Adversarial actors may attempt to exploit GraphRAG indexing and retrieval through:

1. **Relation-level Poisoning**:
   - Injected or modified edges (e.g., false `COORDINATED_WITH` relations) to misdirect multi-hop traversal.
   - Modifying edge weights to artificially elevate the importance of adversarial sources during retrieval.
2. **Community/Cluster Manipulation**:
   - **Densifying subgraphs**: Creating many false relations around a specific narrative to force community detection algorithms to group it with legitimate clusters.
   - **Narrative Drift**: Gradually introducing "contradictory but plausible" edges to pivot a summarized community's intent over time.
3. **Multi-hop Propagation**:
   - A single poisoned relation (e.g., Actor A -> Targets -> Entity B) propagating across global queries that aggregate community summaries, leading to systemic misattribution or bias.

## System Flows and Controls

### Ingestion to Query Flow
```text
Ingestion (Sources)
      │
      ▼
Graph Construction (Nodes/Edges) ───► Conflict Detection
      │
      ▼
Community Detection/Summarization ───► Flagged Communities
      │
      ▼
Query-time Retrieval (Multi-hop) ───► Provenance Checks
      │
      ▼
Answer Generation (LLM)
```

### Counterintelligence Intercept Points
- **At Ingestion**: Source vetting and filtration (e.g., blacklisting known adversarial outlets, validating source integrity).
- **At Graph-Construction**: Relation validation and conflict detection (cross-checking `supports` vs `contradicts` across multiple sources).
- **At Retrieval**: Poisoning suspicion scoring and relation provenance checks (verifying the "trust" level of each step in a multi-hop path).
- **At Summarization**: Conflict-aware summaries that explicitly surface internal community contradictions instead of smoothing them over, ensuring flagged communities are handled with caution.
