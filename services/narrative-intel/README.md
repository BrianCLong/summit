# Narrative Intelligence Service (v1)

Detects and tracks narrative operations using structural invariants.

## Features
- **Narrative Skeleton Extraction**: Frame elements, causal chains, moral evaluation.
- **Structure Fingerprinting**: Topic-agnostic clustering.
- **Propagation Tracking**: Multi-hop laundering paths.
- **Role Consistency**: Actor role detection across narratives.
- **Resurfacing Detection**: Long-memory time-gap analysis.
- **Credibility Analysis**: Style shifts and visual/argument alignment.

## Architecture
- **Language**: Python 3.10+
- **Inputs**: Enriched Documents (JSON)
- **Outputs**: Narrative Skeletons, Graph Updates, Evidence Artifacts.

## Directory Structure
- `src/`: Source code.
- `spec/`: Schemas and Specifications.
- `api/`: OpenAPI definitions.
- `tests/`: Unit and Integration tests.
- `evals/`: Benchmarks (CARB, etc.).
- `helm/`: Kubernetes deployment charts.

## Usage
See `api/openapi.yaml` for API details.
