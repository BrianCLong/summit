# System Overview

This document provides a high-level overview of the Summit platform layers, integration flows, and data pipelines.

## Platform Layers

1.  **Layer 1 — AI Dev Stack Map**: A registry of AI development tools and deployment profiles.
2.  **Layer 2 — Tool Adapter Control Plane**: Adapters and orchestrators for executing tasks across registered tools.
3.  **Layer 3 — AI Tool Radar**: Scanners and classifiers to monitor the evolving AI tool ecosystem.
4.  **Layer 4 — Market Intelligence Engine**: Ingestion and analytics of market signals like funding, hiring, and GitHub velocity.
5.  **Layer 5 — Autonomous Strategy Engine**: Planners that discover new tools and recommend repository integration plans.
6.  **Layer 6 — Autonomous Self-Improving Engineering System**: Analyzers that measure platform performance and propose architecture optimizations.

## Integration Flows

-   **Data Ingestion**: The system continuously ingests data from external sources (GitHub, RSS feeds, jobs boards, etc.).
-   **Graph Enrichment**: Insights and metrics from all layers are written back to the shared GraphRAG core (Neo4j, Qdrant, Postgres, Redis).
-   **CI Integration**: Validation gates ensure deterministic output and enforce security policies.

## Data Pipelines

-   **Evidence Ledger**: Every agent action is recorded as an immutable piece of evidence with a deterministic hash.
-   **Market Analysis**: Raw market signals are transformed into trend analysis and anomaly detection reports.
