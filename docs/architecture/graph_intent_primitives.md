# Graph Intent Primitives

**Status:** Draft
**Owner:** Architecture
**Last Updated:** 2026-01-26

## Overview

This document defines the core primitives for Summit's **Graph Intent Architecture**. This architecture moves beyond naive GraphRAG (retrieval-augmented generation) by treating graph interaction as a compiler problem: mapping user intent to deterministic, budget-constrained graph queries.

## 1. Intent Compilation

**Definition:** The process of translating a natural language user query into a formal, intermediate `IntentSpec` before any database interaction occurs.

*   **Problem Solved:** Decouples semantic understanding (LLM) from data access (Cypher).
*   **Failure Mode Prevented:** Hallucinated Cypher syntax, unpredictable query patterns, non-deterministic retrieval.
*   **Supersedes:** Direct Text-to-Cypher generation without intermediate validation.

## 2. Evidence Selection vs. Retrieval

**Definition:** A paradigm shift from "retrieving relevant chunks" to "selecting the minimum necessary structural evidence" to support a claim.

*   **Problem Solved:** Context window pollution, irrelevant "top-k" noise.
*   **Failure Mode Prevented:** LLM distraction, reasoning errors due to overwhelming context.
*   **Supersedes:** Vector-only similarity search.

## 3. Deterministic Query Shaping

**Definition:** Enforcing strict structural constraints on Cypher queries (e.g., explicit `ORDER BY` clauses, avoidance of `OPTIONAL MATCH` ambiguity) to ensure identical inputs produce identical outputs.

*   **Problem Solved:** Variance in LLM answers caused by non-deterministic result ordering or shape.
*   **Failure Mode Prevented:** "Flaky" reasoning where the same question yields different answers on retry.
*   **Supersedes:** Raw Cypher generation.

## 4. Evidence Budgeting

**Definition:** A mechanism to strictly limit the graph traversal depth, node count, and path complexity *before* execution, based on the query's estimated "reasoning cost".

*   **Problem Solved:** Unbounded queries crashing the DB or overflowing LLM context.
*   **Failure Mode Prevented:** "Reasoning budget" exhaustion, slow responses, token waste.
*   **Supersedes:** Post-retrieval truncation.

## 5. Neural Priors as Graph Properties

**Definition:** Using GNNs (Graph Neural Networks) or other ML models to pre-compute "importance" or "trust" scores and storing them as node/edge properties, rather than computing them at query time.

*   **Problem Solved:** Latency in scoring large subgraphs.
*   **Failure Mode Prevented:** Runtime complexity explosion.
*   **Supersedes:** Real-time re-ranking of all retrieved nodes.

## 6. LLM Stability Engineering

**Definition:** Optimizing the *shape* of the retrieved graph context (e.g., serialization format, sorting) to maximize the stability of the LLM's downstream reasoning.

*   **Problem Solved:** Sensitive LLMs producing different outputs for semantically identical but syntactically different contexts.
*   **Failure Mode Prevented:** Logic drift.
*   **Supersedes:** Raw JSON dumps.

## 7. Auditability of Reasoning Paths

**Definition:** The requirement that every returned answer must be traceable to a specific, executed Cypher query and a specific set of Evidence IDs.

*   **Problem Solved:** "Black box" AI answers.
*   **Failure Mode Prevented:** Unverifiable claims, regulatory non-compliance.
*   **Supersedes:** Standard citation methods.
