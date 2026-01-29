# Relationship Intelligence Substrate

## Overview

This schema defines the normalized structure for sharing relationship graph data between the pipeline and the GNN prioritizer.

## Schema

See `evidence/schemas/relationship_intel.schema.json`.

## Privacy

Edges with `privacy_class` of `RESTRICTED` or `CONFIDENTIAL` must be handled according to `docs/privacy.md`. The GNN stub currently receives only anonymized feature vectors, but future implementations must respect these tags.
