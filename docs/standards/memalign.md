# MemAlign Standard

## Overview
MemAlign implements a dual-memory system for LLM judges, allowing them to align with human feedback without fine-tuning.

## Components
1.  **Semantic Memory**: Distilled guidelines and principles.
2.  **Episodic Memory**: Specific examples (few-shot).

## Evidence Artifacts
All alignment runs must produce deterministic artifacts:
*   `report.json`: The alignment report containing inputs, retrieved memories, and decisions.
*   `metrics.json`: Performance metrics (latency, agreement).
*   `stamp.json`: Versioning and environment stamp (excluding volatile timestamps).

## Data Handling
*   **PII**: All PII must be redacted before storage.
*   **Retention**: Episodic examples default to 30 days unless pinned.
*   **Poisoning**: Feedback must be signed and validated against a schema.

## Integration
*   Judges wrap the base evaluation logic with a retrieval step.
*   CLI `judge:align` drives the alignment process.
