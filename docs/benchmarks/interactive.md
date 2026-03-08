# Interactive Benchmarks Substrate

## Overview
The Interactive Benchmark Substrate provides a deterministic, environment-driven framework for evaluating agentic intelligence within Summit. It moves evaluation from static single-pass question-answering to interactive, multi-step problem solving with budget constraints.

## Architecture
- **Environment**: A stateful sandbox that processes actions and yields observations and rewards.
- **Agent**: An interface that decides on an `Action` given an `Observation`.
- **Runner**: Orchestrates the interaction loop between Agent and Environment, enforcing step and wall-clock budgets.
- **Scoring**: Purely deterministic functions that score the interaction `Trace` (e.g., information gain, budget efficiency).

## Artifacts
Each benchmark run produces deterministic JSON artifacts:
- `report.json`: High-level run summary, success/fail status.
- `metrics.json`: Scalar strategy metrics.
- `stamp.json`: Versioning and reproducibility metadata.
- `trace.ndjson` (or `.json`): Event-by-event logging of the agent-environment loop.

These artifacts use the standard evidence ID pattern: `SUMMIT-IB-<suite>-<case>-<run>`.

## Development
- To add a new environment, implement the `BaseEnvironment` interface.
- To add a new agent adapter, implement the `BenchmarkAgent` interface.
- Metrics are derived entirely from the `trace` artifact.
