# Narrative CI Pipeline

This pipeline implements "CI for narratives", providing deterministic scoring, state tracking, and evidence generation for narrative analysis.

## Components
- **Schema**: Defined in `schemas/narrative/*.json` and `intelgraph/schema/narrative.graph.yml`.
- **Metrics**: Resilience, Seeding Density, Handoff Score, Compression Ratio.
- **State Machine**: Deterministic transitions based on metric thresholds.
- **Evidence**: Bundled JSON artifacts with provenance receipts.

## Running Locally
```bash
# Run evidence bundler with fixtures
node intelgraph/pipelines/narrative_ci/steps/50_bundle_evidence.ts --fixture
```

## Configuration
Thresholds are defined in `config/defaults.yml`.
