# Scaling & AutoML Orchestrator v0.1 Architecture

## Purpose
The Scaling & AutoML Orchestrator ingests telemetry from the Summit stack, fits lightweight scaling/response models, and proposes the next experiments and training runs. It targets fast iteration on small/medium models (0.3B–1.3B) while producing guidance for larger roadmap steps.

## Objectives
- Turn heterogeneous logs into a normalized feature table spanning model, data, training, runtime, safety, and tool-usage signals.
- Fit simple, explainable scaling laws and ML regressors to predict quality, safety, and cost/latency outcomes.
- Search the configuration space under budget/constraint envelopes and emit runnable experiment configs plus rationale.
- Provide an API that downstream systems (trainers, schedulers, dashboards) can call for recommendations and Pareto frontiers.

## System Context
```
[Summit Training Stack] ---> Telemetry Ingestor ---> Experiment Registry ---> Scaling Model ---> AutoML Engine ---> Planner/API
         |                                                           ^                                   |
         |---- Eval/SRE Logs ----------------------------------------|                                   |
         |---- Runtime/Safety Logs -----------------------------------------------------------------------|
```

## Component Responsibilities
### Telemetry Ingestor
- Sources: training JSONL, evaluation/benchmarks, tool-use/SRE traces, runtime latency logs, governance/safety outputs.
- Tasks: schema validation, normalization to feature rows, backfilling derived features (FLOPs, effective tokens, cost), anonymization hooks.
- Interfaces: accepts local paths or object storage URIs; writes normalized rows to the Experiment Registry.

### Experiment Registry
- Storage: pluggable (JSONL/Parquet for v0.1; Postgres ready hook). Uses schemas in `impl/scaling/schemas/*.schema.json`.
- Entities: config, run metadata, metrics, recommendation artifacts.
- Capabilities: upsert runs, tag experiments, fetch cohorts for fitting, surface provenance (data versions, code commit, hardware).

### Scaling Model Layer
- Parametric fits: power-law/log-linear for loss vs compute/params and for reasoning/tool-success metrics vs compute.
- Response surfaces: tree/boosted regressors over config features (size, depth/width, context, data mix ratios, LR schedule, curriculum, MoE flag) → metrics.
- Uncertainty: per-fit residuals + prediction intervals; expose explainability (feature importances, partial dependence).

### AutoML Engine
- Search space: model family (dense/MoE), parameter count, depth/width ratios, context length, data mix ratios, LR schedule hyperparameters, curriculum flag, augmentation toggles.
- Algorithms: random search baseline; Bayesian/sequential model-based optimization using fitted response surfaces.
- Constraints: GPU-hour budget, wall-clock budget, max parameters, memory footprint, allowed data sources/safety constraints.
- Utilities: expected improvement weighted by multi-objective utility (quality, safety, latency, cost).

### Planner & API
- Core method: `plan(objective, budget, constraints)` returns recommended config, expected metrics, rationale, and follow-on experiment set.
- Outputs: top-1 recommendation, Pareto frontier candidates, and an evaluation plan (which eval suites to run, expected cost).
- Delivery: REST/GraphQL facade (future), CLI/SDK for v0.1. Rich metadata for trust (feature importances, why-this-choice notes).

## Data Flow
1. Ingestor validates raw JSONL logs → normalized `experiment` rows.
2. Registry surfaces training/eval slices → scaling model fitter produces `scaling_law_fits` artifact.
3. AutoML Engine queries fits + registry data → proposes candidate configs, predicts metrics, and scores under constraints.
4. Planner API returns recommendations and optionally writes planned experiments back to the registry for scheduling.

## Data Model (abridged)
- **config**: model (family, params, depth/width, moe/expert counts), training (lr schedule, optimizer, warmup/decay, batch), data mix (datasets + ratios), context length, curriculum flag, augmentation toggles.
- **metrics**: training loss, eval reasoning/tool/safety scores, latency/throughput, cost (gpu hours, cloud cost), stability (divergence, retries), uncertainty bands.
- **experiment**: identifiers, config, hardware, runtime environment, dataset versions, derived compute (FLOPs), metrics, artifacts locations.
- **recommendation**: objective, constraints, predicted metrics, config suggestion, expected utility, explanations, follow-on experiment set.

## APIs (v0.1 draft)
```python
Recommendation = planner.plan(
    objective="reasoning_score",
    budget={"gpu_hours": 5000},
    constraints={"max_params": 8e9, "context_len": [8192, 65536], "allow_moe": true},
    preference_weights={"quality": 0.5, "safety": 0.2, "latency": 0.3},
)
```
- Secondary endpoints: `get_pareto_frontier(objective, constraints)`, `record_experiment(run)`, `fit_scaling_models(dataset_ref)`.

## Experimentation Loop
- Ingest past runs (0.3B/0.7B/1.3B variants, curriculum on/off, data mix sweeps).
- Fit scaling curves (loss, reasoning score) and response regressors including runtime/safety signals.
- Run config search simulations comparing random vs AutoML-guided; store to `/benchmark/automl_search_results.json`.
- Emit recommended configs + eval plan; optionally auto-schedule via training orchestrator hook.

## Observability & Ops
- Logging: structured JSON with trace/run IDs; summarize ingest stats and model fit diagnostics.
- Metrics: ingest throughput, schema validation errors, fit residuals, AutoML iteration gains, recommendation latency.
- Alerts: high ingestion error rate, degraded fit quality, stale data (> N days), recommendation confidence below threshold.
- Security: PI/PHI redaction hooks in ingestor; allowlist data sources; signed recommendation artifacts.

## Roadmap Notes
- v0.1: offline/CLI-first, JSONL-backed registry, scikit-learn regressors, simple Bayesian search.
- v0.2+: live service with Postgres + object store, richer causal models, reinforcement for closed-loop scheduling, multi-tenant governance, frontier roadmap generator.
- Frontier planning: sequence of configs over time under compute cap, adaptive eval scheduling, integration with hardware-aware compilers.
