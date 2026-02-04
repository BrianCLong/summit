# GraphRAG Benchmarking & Validation Plan

**Owner:** Data Science / Intelligence
**Last-Reviewed:** 2026-01-24
**Evidence-IDs:** none
**Status:** active

## Overview

This plan defines how Summit validates the efficacy of GraphRAG compared to traditional vector-only RAG. We focus on multi-hop accuracy, explainability, and resource efficiency.

## Core Metrics

| Metric | Definition | Target |
| :--- | :--- | :--- |
| **Multi-hop Accuracy** | % of queries requiring 2+ hops answered correctly. | > 85% |
| **Citation Fidelity** | % of LLM citations that correctly link to supporting Evidence IDs. | 100% |
| **Token Efficiency** | Context size reduction vs. brute-force document retrieval. | > 40% reduction |
| **Retrieval Latency** | Time to execute Cypher and assemble context. | < 500ms |
| **Explainability Delta** | Human-rated score of "how easy is it to verify this answer?" | +2 points (1-5 scale) |

## Test Harness Requirements

### 1. Gold Dataset
A curated set of 500 multi-hop questions with known ground-truth paths in the Knowledge Graph.
- **Example**: "Which campaigns led by Actor Alpha used Malware Beta between June and August?"

### 2. A/B Evaluation Framework
- **Variant A**: Vector-only RAG (Top-K chunk retrieval).
- **Variant B**: GraphRAG (Cypher traversal + context assembly).
- **Evaluation**: Both variants are fed to the same LLM (e.g., GPT-4o) and scored by a "Judge LLM" and human experts.

## Validation Gates for CI

GraphRAG improvements must pass the following CI gates:

1.  **Deterministic Match**: 100% match on context assembly for identical graph states.
2.  **Schema Integrity**: New Cypher templates must not violate Neo4j schema constraints.
3.  **Performance Baseline**: No regression in retrieval latency beyond 10% of baseline.

## Reproducibility

Benchmark runs must produce a `benchmark-report-<timestamp>.json` containing:
- Graph version (commit SHA).
- Cypher queries executed.
- LLM prompt used.
- Scores for all core metrics.
