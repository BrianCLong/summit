# Simulation Engine Architecture

## Overview
The `StrategicSimulationEngine` is a standalone, stateless service designed to answer "What If" questions by processing historical data against hypothetical constraints.

## Core Components

### 1. Snapshotting
The engine does not query the database directly. Instead, it accepts a `SimulationSnapshot` object containing:
*   **Quotas**: Active tenant quotas.
*   **Budgets**: Active financial constraints.
*   **Usage History**: A time-series of recent resource consumption events.

This design ensures:
*   **Consistency**: All calculations happen on a frozen point-in-time state.
*   **Safety**: Zero risk of accidental database writes or side effects.

### 2. Execution Logic
The engine implements specific logic for each `StrategicScenarioType`:

*   **CAPACITY_LOAD**: Replays historical usage events with a `trafficMultiplier`. It checks these multiplied events against existing `TenantQuota` limits to detect throttling or breaches.
*   **COST_BUDGET**: Applies a `budgetReductionPercentage` to existing budget limits and compares them against `forecastedSpending` (or current spending) to predict exhaustion.

### 3. Output
The engine returns a `StrategicSimulationResult` which includes:
*   **Pass/Fail Boolean**: Immediate signal of sustainability.
*   **Metrics**: Quantitative data (e.g., peak utilization).
*   **Deltas**: Comparison vs. baseline.
*   **Trace**: Human-readable explanation of *why* a failure occurred (e.g., specific tenant hitting a specific limit).

## Usage Pattern

```typescript
// 1. Capture State (in a route handler or service)
const snapshot = await captureSystemSnapshot();

// 2. Define Scenario
const params = { trafficMultiplier: 1.5, resourceType: 'tokens' };

// 3. Run Simulation
const result = await engine.runSimulation(
  StrategicScenarioType.CAPACITY_LOAD,
  params,
  snapshot
);

// 4. Present Results
return result;
```
