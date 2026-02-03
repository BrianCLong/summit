# Orchestration Benchmarks

This directory contains the methodology and scenarios for benchmarking Summit's Agentic Orchestration engine against standard "flat" or "chat-based" approaches.

## Methodology

We measure three core dimensions of orchestration performance:

### 1. Cost of Intelligence (CoI)
*   **Metric:** `tokens_per_outcome`
*   **Definition:** The total number of input/output tokens consumed to reach a verifiable `SUCCESS` state.
*   **Goal:** Demonstrate that Hierarchical/Graph-based orchestration uses fewer tokens than iterative chat loops.

### 2. Orchestration Latency Overhead
*   **Metric:** `overhead_ms`
*   **Definition:** `Total_Duration - Sum(Worker_Execution_Duration)`
*   **Goal:** Keep orchestration overhead (planning, routing, governance checks) below 10% of total execution time.

### 3. Decision Stability (Determinism)
*   **Metric:** `reproducibility_score` (0.0 - 1.0)
*   **Definition:** The percentage of runs where the `OrchestrationDecisionLog` is identical given the same input `inputHash`.
*   **Goal:** > 0.99 for "Golden Path" scenarios.

## Running Benchmarks

*(Note: Actual benchmark scripts are to be implemented in `scripts/bench/orchestration.ts`)*

The scenarios are defined in `scenarios.yaml`.
