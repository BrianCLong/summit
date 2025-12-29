---
title: AI & ML Architecture
summary: Copilot, GraphRAG, and Narrative Simulation.
version: v2.0.0
lastUpdated: 2025-12-29
---

# AI & ML Architecture

Summit integrates advanced AI capabilities directly into the intelligence workflow.

## 1. Multimodal Copilot

The Copilot serves as an analyst's force multiplier.

- **Input**: Text, Image, Audio.
- **Processing**:
  - **OCR/Vision**: YOLO/Tesseract for object and text detection.
  - **Audio**: Whisper for transcription.
  - **NLP**: spaCy for entity extraction.
- **Output**: Structured graph entities and relationships proposed to the analyst.

## 2. GraphRAG (Retrieval Augmented Generation)

To ground LLM responses in truth, we use GraphRAG.

1.  **Query**: User asks "Who connects Entity A and B?"
2.  **Retrieval**: System performs a k-hop expansion or shortest-path query in Neo4j.
3.  **Augmentation**: The resulting subgraph is serialized (JSON/Text) and injected into the LLM prompt.
4.  **Generation**: The LLM answers based _only_ on the provided graph context.

## 3. Narrative Simulation Engine (EvoSim)

A "what-if" engine for threat evolution.

- **Model**: Tick-based simulation.
- **Logic**: Hybrid (Rule-based heuristics + LLM adapters).
- **State**: Tracks "Momentum", "Sentiment", and "Influence" of entities over time.
- **Integration**: Runs alongside the API; exposes state via REST for the timeline UI.

## 4. Black Projects (Modules)

Specialized, pluggable AI modules (e.g., "Active Measures", "PsyOps Detection").

- Managed via feature flags.
- Isolated execution contexts.
