# Summit Data Model Documentation

Welcome to the central repository for the **Summit Data Model** and **Schema** documentation. This directory provides comprehensive reference materials for the core domain concepts, entities, and data structures utilized across the Summit platform.

## Overview

The Summit data model is defined through canonical schemas that are shared across ingestion pipelines, cognitive services, API gateways, and the Knowledge Graph. This documentation serves as the single source of truth for:

- **Entities & Relationships**: Core domain types like `Case`, `Person`, `Organization`, `Location`, and `Event` and how they interrelate.
- **Document & Multimodal Ingestion**: Structures for handling unstructured source documents, chunking strategies, and embedding representations.
- **Narrative & Risk Intelligence**: Models representing document-level assertions, causal chains, credibility scoring, and risk metrics.
- **API Interfaces**: Standardized GraphQL input/output types governing system interaction.

## Documentation Structure

| Document | Description |
|---|---|
| [`knowledge-graph.md`](./knowledge-graph.md) | Canonical definitions and Mermaid ER diagrams for the core Knowledge Graph entities and relationships (v1). |
| [`document-ingestion.md`](./document-ingestion.md) | Data structures for `SourceDocument`, document chunking, layout parsing, and embeddings. |
| [`narrative-risk.md`](./narrative-risk.md) | Schema documentation for the `Narrative Skeleton`, risk signals, credibility, and framing analysis. |
| [`api-types.md`](./api-types.md) | Reference for common GraphQL schemas governing APIs like `LaunchRunInput`, `Runbook`, and `Run`. |

## Schema Registry & Versioning

For information regarding schema versioning policies, backwards-compatibility guarantees, and migration guidelines, please refer to the [`docs/schema/README.md`](../schema/README.md) documentation.

All canonical schemas are defined as JSON Schema (Draft-07 / 2020-12) or GraphQL IDL, with source files primarily located under `domain-model/`, `schemas/`, `api-schemas/`, and specific service directories.
