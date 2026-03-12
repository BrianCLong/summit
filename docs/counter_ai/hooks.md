# Counter-AI Risk Hooks

## Purpose
This document details the minimal, low-overhead hooks placed at key GraphRAG and model-interaction points. These hooks allow future anomaly detectors and defensive policies to observe and score risks identified in the `Counter-AI Risk Register` without restructuring core pipelines.

## Implementation Details

The core abstraction is a lightweight `RiskObservationEmitter` that records structured in-process events.

### `emitRiskObservation(risk_surface, metadata)`
This function is intentionally designed to be fire-and-forget. It does not perform any blocking operations, external network calls, or heavy computations. It simply adds a `RiskObservation` object to a bounded internal array (`DefaultRiskObservationEmitter`).

## Hook Locations

Hooks have been selectively placed in the following critical paths:

1.  **Relation Creation (`src/graphrag/core/evidence/relation-extractor.ts`)**
    *   **Surface:** `graph_indexing:relation_creation`
    *   **Purpose:** To monitor for `CAI-001 (GRAPH_RELATION_INJECTION)`. By observing the creation of new edges, detectors can flag sudden spikes in connectivity or anomalously high confidence scores between previously disjoint entities.
    *   **Metadata:** Node IDs (source, target), relation type, confidence.

2.  **Community Summary Updates (`src/graphrag/core/community/community-detection.ts` or similar)**
    *   **Surface:** `community_detection:summary_update`
    *   **Purpose:** To detect `CAI-002 (COMMUNITY_DENSIFICATION)`. Hooks here allow monitoring for rapid merging of distinct communities or unnatural clustering coefficient increases.
    *   **Metadata:** Community IDs, involved node IDs, update metrics.

3.  **Agent Prompt Boundaries (`src/agents/core/agent-runner.ts` or similar)**
    *   **Surface:** `agent:prompt_boundary`
    *   **Purpose:** To identify `CAI-004 (PROMPT_JAILBREAK)`. These hooks signal "high-risk interaction points" where raw user input or potentially tainted data is formatted into prompts for the LLM.
    *   **Metadata:** Agent ID, prompt templates, length/complexity metrics (no raw PII/sensitive data).

## How to Attach Future Detectors
Future detectors can subscribe to these events (e.g., via a pub/sub mechanism or by periodically querying `globalRiskEmitter.getRecentObservations()`) to run heuristic checks, calculate risk scores, or trigger alerts based on the registered `CounterAiRisk` definitions.
