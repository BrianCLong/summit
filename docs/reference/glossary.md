---
title: Glossary
summary: Definitions of common terms in the Summit ecosystem.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Glossary

## Core Terms

### IntelGraph

The overarching name for the AI-augmented intelligence analysis platform.

### Summit

The codebase name / monorepo project name.

### Entity

A discrete node in the knowledge graph (Person, Organization, Event, etc.).

### Relationship

A directed edge between two Entities, carrying semantic meaning (WORKS_FOR, LOCATED_AT).

### Provenance

Metadata tracking the origin, time, and confidence of a piece of data.

## System Components

### Maestro

The orchestration engine responsible for managing long-running workflows, agent lifecycles, and pipelines.

### GraphRAG

**Graph Retrieval-Augmented Generation**. A technique where the LLM's context window is enriched with relevant subgraphs from Neo4j to reduce hallucinations and provide grounded answers.

### Copilot

The AI assistant interface that helps analysts query the graph using natural language.

### Narrative Sim

A simulation engine that evolves "what-if" scenarios based on entity relationships and probabilistic events.

## Operations

### Golden Path

The standard, supported workflow for development and deployment: `make bootstrap && make up && make smoke`.

### Runbook

A documented procedure for handling specific operational incidents (e.g., "High Error Rate Response").
