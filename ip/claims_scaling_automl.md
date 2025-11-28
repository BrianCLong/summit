# Candidate Claims: Scaling & AutoML Planner

## Independent Concepts
1. **Telemetry-rich scaling and configuration planning** that fuses training, evaluation, runtime, tool-use, and governance telemetry into predictive scaling models and uses them to recommend LM configs under cost/safety constraints.
2. **Closed-loop AutoML for unified LLM stacks** that maintains a response surface over configuration space and automatically generates, prioritizes, and schedules new experiments to optimize multi-objective goals (quality, latency, safety, cost).

## Dependent Directions
- Joint modeling of reasoning, tool-use, and safety metrics beyond perplexity; incorporating evaluation uncertainty in the planner.
- Multi-objective and Pareto-set recommendation surfaces balancing safety vs. quality vs. cost/latency.
- Governance-aware constraints (allowed datasets, safety minima) applied during search and enforced in emitted configs.
- Curriculum and data-engine parameters treated as first-class optimization knobs alongside model/training hyperparameters.
- Mixed-family search (dense + MoE) with routing/top-k controls as parameters.
- Time-to-train predictions and GPU scheduling heuristics baked into the search utility.
- Frontier roadmap generation that outputs a sequence of model scales and timelines under compute budgets.
- Eval-budget allocation using scaling models to decide which eval suites to run and when.

## Enablement & Evidence Artifacts
- Schemas: `impl/scaling/schemas/*.schema.json` encode telemetry and recommendation fields.
- Architecture: `specs/scaling_automl_arch.md` documents ingest, modeling, and planner flows.
- Planned benchmarks: `/benchmark/scaling_law_fits.json` and `/benchmark/automl_search_results.json` (to be populated with fit and search outcomes).
