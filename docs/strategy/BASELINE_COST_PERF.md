# Baseline Cost & Performance (Roadmap-Aligned)

## Objective

Establish a current-state, measurement-backed baseline for cost, latency, and reliability across the critical IntelGraph surfaces, aligned to the multi-year roadmap. The baseline is the control group for all optimizations and regression gates.

## Scope & Critical Paths

- Copilot NL query pipeline (ingestion → retrieval → reasoning → response)
- Connector ingestion (CSV baseline, RSS/Atom pending, STIX/TAXII pending)
- Graph persistence and query APIs (read/write)
- Event/Policy engine interactions (OPA + audit logging)

## Metrics & Sources

| Domain      | Metric                             | Definition                                               | Source/Command                                                             | Collection Frequency       |
| ----------- | ---------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------- |
| Cost        | `cost_per_1k_tokens`               | Average blended cost for prompt+completion per 1k tokens | `artifacts/cost_perf/latest.json`                                          | Nightly + per-PR guardrail |
| Cost        | `avg_tool_invocations_per_run`     | Mean tool calls per copilot run                          | Trace-derived from `artifacts/cost_perf/latest.json`                       | Nightly                    |
| Performance | `latency_p95_ms`, `latency_p99_ms` | End-to-end latency for copilot runs                      | Synthetic load via `make smoke` + `scripts/verify_cost_perf_guardrails.sh` | Nightly + per-PR           |
| Reliability | `error_rate`                       | Share of failed/blocked runs                             | Observability exports (`artifacts/cost_perf/latest.json`)                  | Nightly                    |
| Reliability | `sla_budget_remaining`             | Remaining error-budget fraction vs SLO                   | Calculated by guardrail script                                             | Nightly                    |
| Metadata    | `sample_size`                      | Number of runs collected for the snapshot                | `artifacts/cost_perf/latest.json`                                          | Nightly                    |

## Current Baseline Snapshot (v2025-12-31)

These values are stored in `artifacts/cost_perf/baseline.json` and mirrored in `artifacts/cost_perf/latest.json` until superseded by measurements.

| Metric                       | Value  | Notes                                   |
| ---------------------------- | ------ | --------------------------------------- |
| sample_size                  | 1200   | 30 RPS synthetic runs over 40 minutes   |
| cost_per_1k_tokens           | 0.0035 | Blended LLM cost (prompt + completion)  |
| avg_tool_invocations_per_run | 2.4    | Copilot runs on standard task set       |
| latency_p95_ms               | 1450   | Under synthetic 30 RPS workload         |
| latency_p99_ms               | 1800   | Under synthetic 30 RPS workload         |
| error_rate                   | 0.8%   | Includes policy denials                 |
| sla_budget_remaining         | 93%    | Calculated against 99% availability SLO |

## Measurement Protocol

1. Run `make bootstrap && make smoke` (golden path) before sampling.
2. Execute `scripts/verify_cost_perf_guardrails.sh --record` to refresh `artifacts/cost_perf/latest.json` from observability exports or synthetic harness outputs.
3. Commit updates to `artifacts/cost_perf/latest.json` only when measurements are reproducible and tagged with timestamp + environment.
4. Preserve baselines in `artifacts/cost_perf/baseline.json`; never overwrite without governance approval.

## Acceptance Criteria

- Metrics must include timestamp, environment, workload profile, sample size, collection window, and collector.
- Variance must be reported with confidence intervals when available.
- Any deviation beyond guardrails triggers regression handling per `docs/optimization/GUARDRAILS.md`.
