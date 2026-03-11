# Hallucination Detection Evaluation Harness

This directory contains the evaluation harness for detecting hallucinations in Summit's GraphRAG query responses. The methodology is designed to systematically evaluate how well GraphRAG responses are grounded in the actual knowledge graph to calculate hallucination rates.

## Methodology

The evaluation harness operates in three primary phases:

### 1. Claim Extraction
The system extracts individual atomic claims from the generated text responses. A "claim" represents a specific assertion or piece of information outputted by the LLM. In this test harness, this phase is simplified using a stub that operates on pre-extracted claims, but in a production environment, this would involve NLP claim extraction.

### 2. Graph Grounding Checker
For each extracted claim, the harness queries a static, ground-truth knowledge graph (defined following the canonical schema in `docs/architecture/summit-graph.schema.json`). It looks for the entities and relationships mentioned in the claim to determine if the knowledge graph supports the claim.

The checker specifically identifies three types of hallucinations:
*   **Unsupported Claims:** Statements that contain entities found in the graph, but the asserted relationship or attribute is absent or unverified by the graph evidence.
*   **Entity Fabrication:** Statements that introduce entities (nodes) that do not exist anywhere in the ground-truth knowledge graph.
*   **Factual Inconsistencies:** Statements that directly contradict the facts explicitly present in the knowledge graph.

### 3. Hallucination Metrics
The harness computes quality metrics for each test case and aggregated over the whole test suite.
The primary metric is the **Hallucination Rate**, calculated as:

`Hallucination Rate = Total Hallucinated Claims / Total Extracted Claims`

A claim is considered hallucinated if it is unsupported, fabricates an entity, or is factually inconsistent.

## Usage

The evaluation is driven by static test fixtures defined in `fixtures.json`.

You can run the evaluation using the Node.js native test runner:
```bash
node --experimental-strip-types --test evals/hallucination/harness.test.ts
```
