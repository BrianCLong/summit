# GraphRAG Provenance Contract

## Overview
This document defines the "Replay Contract" and provenance requirements for the GraphRAG subsystem. It ensures that every GraphRAG operation is deterministic, reproducible, and fully auditable.

## Replay Contract

**Principle**: Executing the same GraphRAG query with the same graph state and configuration MUST yield byte-identical retrieval artifacts and context payloads.

### Determinism Rules

1.  **Graph Traversal Ordering**:
    *   All node and edge lists returned from graph queries must be sorted by a stable unique identifier (e.g., `id` or `uuid`) in ascending order.
    *   Relationship traversals must define an explicit order if order is semantic; otherwise, they must be canonicalized (sorted by target node ID).

2.  **Vector Search Tie-Breaking**:
    *   When vector similarity scores are identical (within a defined epsilon), results must be sorted by their unique ID to ensure consistent ranking.

3.  **Context Assembly**:
    *   The construction of the prompt context (system prompt + retrieved knowledge) must follow a strict, deterministic template.
    *   JSON serialization of context data must use a canonical form (sorted keys).

4.  **Randomness Control**:
    *   Random seeds for any stochastic processes (e.g., clustering algorithms used in retrieval) must be fixed or logged as part of the input configuration.
    *   Timestamps included in the content hash must be logical (e.g., snapshot ID) rather than wall-clock time, or excluded from the hash entirely.

## Provenance Schema

For every GraphRAG execution, a provenance artifact must be generated containing:

### 1. Inputs
*   **Query**: The original user query or agent intent.
*   **Schema Version**: Version of the provenance schema used.
*   **Configuration**: Model parameters (temperature=0 for determinism where possible), max tokens, etc.

### 2. Retrieval Metadata
*   **Traversal Path**: Ordered list of visited nodes and edges.
*   **Vector Candidates**: List of candidate nodes from vector search, including scores and IDs.
*   **Ranking**: Final ranked list of context items.

### 3. Context Assembly
*   **Context Payload**: The exact text/JSON block injected into the LLM context window.
*   **Context Hash**: SHA-256 hash of the Context Payload for integrity verification.

### 4. Model Invocation
*   **Model Name/Version**: e.g., `gpt-4-0613`.
*   **Token Usage**: Input/output token counts.

### 5. Outputs
*   **Generated Answer**: The text response.
*   **Citations**: References to specific nodes/edges used in the answer.
*   **Confidence Score**: Self-assessed confidence (if applicable).

## Audit Walkthrough

To verify a GraphRAG run:

1.  **Retrieve Artifact**: Fetch the provenance JSON for the `run_id`.
2.  **Verify Hash**: Re-compute the SHA-256 hash of the `context_payload` and match it against the `context_hash`.
3.  **Replay Retrieval**:
    *   Using the recorded `inputs` and graph state (at snapshot), re-run the retrieval logic.
    *   Verify that the resulting `traversal_path` and `ranking` match the provenance record exactly.
4.  **Verify Determinism**:
    *   Run the retrieval multiple times.
    *   Ensure the output hash is identical across runs.

## Compliance
This contract satisfies the following Summit Governance Controls:
*   `GOV-REPLAY-001`: System Determinism
*   `GOV-PROV-001`: Data Provenance
*   `AUDIT-TRACE-001`: End-to-End Traceability
