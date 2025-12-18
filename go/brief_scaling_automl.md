# Summit Frontier Planner / AutoML Service Brief

## Offering Overview
A telemetry-driven scaling and AutoML planner that ingests Summit stack logs, fits scaling/response models, and outputs executable experiment configs plus roadmap guidance. Delivered as:
- **Hosted Planner Service** alongside customer training stacks with API/SDK access.
- **On-prem Planner SDK** for air-gapped or sensitive deployments.
- **Advisory engagements** that deliver frontier roadmaps powered by the planner.

## Buyer Targets
- Labs or enterprises training bespoke LMs seeking faster iteration and cost-aware scaling guidance.
- Hardware vendors showcasing optimal model configs on their accelerators.
- Internal Summit roadmap planning for frontier releases.

## Value Props
- Reduce wasted runs via AutoML-guided search under GPU/time/safety constraints.
- Unify signals from training, eval, runtime, tool usage, and governance to guide scaling decisions.
- Provide explainable recommendations (feature importances, expected trade-offs) to build trust with practitioners and governance teams.

## Packaging & Licensing
- Usage-based pricing on recommendation calls + optional GPU-hour planning add-on.
- Enterprise tier with SLA, customization of governance constraints, and private deployments.
- Licensing hooks for hardware partners (co-branded benchmarks, pre-tuned configs).

## Key Artifacts
- Architecture: `specs/scaling_automl_arch.md`.
- Data contracts: `impl/scaling/schemas/*.schema.json`.
- IP alignment: `ip/claims_scaling_automl.md`.
