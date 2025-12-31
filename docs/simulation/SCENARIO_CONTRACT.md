# Scenario Simulation Contract

## 1. Overview
The Strategic Simulation Engine allows operators and leaders to run **read-only, counterfactual scenarios** against the platform's current state. This enables "what-if" analysis for capacity planning, budget changes, and policy adjustments without affecting live operations.

## 2. Core Guarantees

### 2.1 Read-Only Execution
*   Simulations **MUST NOT** mutate the live state of the system (e.g., database records, live budgets, running jobs).
*   Simulations **MUST** operate on a snapshot or a mock of the state.
*   Simulations **MUST** be side-effect free (no external API calls that mutate state, no emails sent, etc.).

### 2.2 Determinism
*   Given the same initial snapshot and scenario parameters, the simulation **MUST** produce the exact same results.

### 2.3 Bounded Execution
*   Simulations **MUST** have a defined time horizon (e.g., "next 24 hours", "next 30 days").
*   Simulations **MUST** have execution time limits to prevent resource exhaustion.

## 3. Scenario Inputs

A scenario is defined by:

1.  **Type**: The class of scenario (e.g., `CAPACITY_LOAD`, `COST_BUDGET`).
2.  **Snapshot**: The base state (captured from live system or provided historically).
3.  **Parameters**: Key-value pairs specific to the scenario type (e.g., `trafficMultiplier: 3.0`).
4.  **Horizon**: The simulated duration (in time units).

## 4. Scenario Outputs

A scenario result must contain:

1.  **Summary**: High-level pass/fail or impact summary.
2.  **Metrics**: Time-series or aggregate metrics showing the simulated behavior.
3.  **Deltas**: Comparison against the baseline (what would have happened without the scenario changes).
4.  **Explainability**:
    *   **Trace**: Which rules/limits were triggered.
    *   **Factors**: What inputs contributed most to the outcome.
5.  **Confidence**: A score or band indicating the reliability of the simulation (e.g., "Low confidence due to missing historical data").

## 5. Supported Scenario Types (Initial Sprint)

### 5.1 Capacity & Load
*   **Question**: "What if traffic grows X%?"
*   **Inputs**: `trafficMultiplier` (float), `affectedRegions` (list), `resourceType` (enum).
*   **Outputs**: `projectedUtilization`, `throttledRequests`, `quotaBreaches`.

### 5.2 Cost & Budget
*   **Question**: "What if we reduce the budget by Y%?"
*   **Inputs**: `budgetReductionPercentage` (float), `targetDomain` (CostDomain).
*   **Outputs**: `projectedSpend`, `budgetExhaustionTime`, `deniedAllocations`.

## 6. Failure Modes

*   **Missing Data**: If the snapshot is incomplete, the simulation fails immediately (Fail-Closed).
*   **Constraint Violation**: If the scenario parameters are invalid (e.g., negative budget), it is rejected.
