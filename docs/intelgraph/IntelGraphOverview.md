# IntelGraph Overview

IntelGraph is the core graph intelligence engine for Summit / Maestro Conductor. It provides a multi-tenant, time-aware knowledge graph that fuses data from disparate sources (code, repos, docs, events, runs) into a single queryable substrate.

## Key Features

1.  **Canonical Data Model**: Strongly typed nodes (Actor, Asset, Incident) and edges.
2.  **Fusion Engine**: Entity resolution and normalization for ingested data.
3.  **Source Epistemics**: Explicit tracking of where data came from, its confidence, and evidence.
4.  **Compiled Knowledge Plans (CKP)**: Executable, graph-native plans for complex reasoning (e.g., "Blast Radius").
5.  **Time-Aware**: Support for `validFrom`/`validTo` and time-travel queries.
6.  **DSL**: A simplified JSON-based Domain Specific Language for agents and UI to query the graph.

## Architecture

*   **Store**: Abstraction over Neo4j.
*   **Fusion**: Ingestion pipeline with adapters for various providers.
*   **API**: Express routes serving REST endpoints and executing DSL/CKP.
