# Counter-AI Risk Register

## Overview
This registry catalogs potential adversarial threats to the AI stack underpinning the Summit platform. This allows the system to actively defend its own GraphRAG indices and decision engines from poisoning.

## Risks
- **R-001: Corpus Poisoning**
  - **Attack Surface**: Ingestion Pipeline -> GraphRAG Index
  - **Symptoms**: Influx of redundant keywords, unverified dominating sources.
  - **Hooks**: Activated on `NarrativeGraph.add_document`.

- **R-002: Relation Injection / Enhancement**
  - **Attack Surface**: Graph Relation Creation
  - **Symptoms**: Rapid edge creation, spikes in semantic similarity.
  - **Hooks**: Activated on `NarrativeGraph.link_similarity`.

- **R-003: Community Densification**
  - **Attack Surface**: GraphRAG Community Detection
  - **Symptoms**: Artificial tight clustering of sockpuppet nodes.
  - **Hooks**: Planned (Community evaluation algorithms).
