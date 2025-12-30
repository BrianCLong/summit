# Evaluator-Portable Narrative Lab (EPNL)

EPNL delivers narrative and coordination analytics through an evaluator-portable pipeline that can be rerun without vendor infrastructure.

## Objectives

- Provide deterministic, containerized narrative analytics with reproducible metrics.
- Freeze interfaces for ingestion, graph construction, coordination scoring, and reporting.
- Support evaluator and peer-review workflows with transparency artifacts.

## Pipeline overview

1. Ingestion: parse narrative inputs and normalize into graph entities/edges.
2. Graph construction: build influence and coordination graphs with versioned schemas.
3. Coordination scoring: apply scoring algorithms with deterministic seeds and resource budgets.
4. Report generation: produce narrative insights, robustness metrics, and replay manifests.

## Deliverables

- Container images for each stage with pinned dependencies.
- OpenAPI interface definitions and compatibility rules.
- Replay manifests with determinism tokens and cryptographic commitments.
- Red-team harness for adversarial perturbations and robustness scoring.
