# Competitive Intelligence & Hybrid Retrieval Architecture

This directory contains documentation and architecture for the Competitive Knowledge Graph (KG), Hybrid Retrieval Planner, and Federation Router.

## Component Diagram

```mermaid
graph TD
    subgraph "Ingestion & KG"
        A[Snapshot Sources] -->|Offline Ingest| B(services/competitive_kg/ingest)
        B -->|Extract| C(services/competitive_kg/extract)
        C -->|Normalize| D[Competitive KG]
        D -->|Render| E[Battlecards]
    end

    subgraph "Evidence Framework"
        D -->|Stamp| F[Evidence Artifacts]
        F --> G[packages/evidence]
        G --> H[Verification]
    end

    subgraph "Hybrid Retrieval"
        I[Client Query] --> J(packages/hybrid_planner)
        J --> K{Federation Router}
        K -->|Route| L(services/federation_router)
        L --> M[Neo4j]
        L --> N[Vector DB]
        L --> O[Fulltext]
    end

    subgraph "Evaluation"
        P[Benchmark Harness] --> J
        P --> F
    end
```

## Overview

### Competitive KG

Ingests competitive intelligence data (snapshots) to produce deterministic evidence and battlecards.
Located in: `services/competitive_kg`

### Sector Countermeasures

[Sector-by-Sector Countermeasure Package](./sector-countermeasures-package.md) - Strategic defense-focused countermeasures for Defense, Cloud, Civil Society, and Media sectors.

### Competitive Analysis

- [Summit vs. OpenClaw Analysis](./openclaw-analysis.md) - In-depth structural and governance comparison.
- [Why Summit Beats OpenClaw (Marketing Sheet)](../marketing/why-summit-beats-openclaw.md) - One-page strategic summary.

### Hybrid Retrieval Planner

Plans queries across graph, vector, and full-text engines.
Located in: `packages/hybrid_planner`

### Federation Router

Routes queries to appropriate data sources enforcing residency and policy.
Located in: `services/federation_router`

## Evidence

Strict schema-based evidence generation.
Schemas in: `packages/evidence/schemas`

## PR Roadmap

### PR-1: Repo Scaffolding

- Directory structure for `services/competitive_kg`, `packages/evidence`, `docs/competitive`.
- Initial schemas and documentation.

### PR-2: Source Snapshot Ingestion

- Ingestion scripts in `services/competitive_kg/ingest`.
- Offline-first processing of HTML/PDF.

### PR-3: Claim Extractor & Capability Taxonomy

- Implementation of claim extraction in `services/competitive_kg/extract`.
- Capability taxonomy definition.

### PR-4: Battlecard Generator

- Rendering logic in `services/competitive_kg/render`.
- Deterministic markdown generation.

### PR-5: Benchmark Harness

- Scaffolding for benchmark runners and evaluation.
