# @intelgraph/connector-sdk

The Summit Connector SDK provides the canonical contracts and runtime abstractions for building and running connectors in the Summit Moat.

## Features

- **Contracts:** TypeScript interfaces reflecting the canonical `connector-manifest`, `entity`, `relationship`, `evidence`, and `lineage` JSON schemas.
- **Manifest Loading:** Validation of `connector.yaml` manifests against the canonical schemas.
- **Deterministic Hashing:** Utility functions for generating deterministic `entity_id` and `relationship_id` hashes.
- **Normalization Helpers:** Utilities for constructing canonical entities and relationships.
