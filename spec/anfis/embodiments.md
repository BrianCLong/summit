# ANFIS Embodiments

## Cloud-Native Service

- Deployed as a containerized microservice with gRPC endpoints for scoring entity pairs using cached graph neighborhoods and vector stores.
- Integrates with policy evaluators that inject tenant and jurisdiction filters before producing ranked outputs.

## Edge Deployment

- Runs as a lightweight model bundle with on-device feature extraction, synchronizing only anonymized attribution summaries to the control plane.
- Supports deferred provenance hydration when intermittently connected to the core knowledge graph.

## Human-in-the-Loop Review

- Presents ranked edges with interpretable attributions in an analyst console where adjudications feed a reinforcement signal.
- Captures reviewer rationales as structured feedback to update weighting priors and compliance attestations.
