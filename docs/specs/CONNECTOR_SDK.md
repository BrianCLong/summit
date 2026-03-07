# Connector SDK Spec

Defines the canonical contracts for connector manifests, raw acquisition envelopes, normalized entities, relationships, and transformation lineage.

Every connector must declare a `connector.yaml` manifest containing metadata like `id`, `version`, `kind`, `license_class`, `collection_mode`, and the types of entities and relationships it emits.

The Connector SDK (`@intelgraph/connector-sdk`) provides the types and utilities for working with these contracts.
