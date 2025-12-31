# Evidence & Explainability

Strategic simulations must be trustworthy. To achieve this, every simulation result includes comprehensive evidence and explainability artifacts.

## 1. Traceability

Every `StrategicSimulationResult` includes an `explanation` object:

*   **Summary**: A concise, natural-language description of the outcome (e.g., "Simulation predicts 50 throttling events with 1.5x load.").
*   **Factors**: A list of the key input variables that drove the simulation (e.g., "Traffic Multiplier: 1.5x").
*   **Traces**: A log of specific "trigger events" detected during the simulation.
    *   *Example*: "Tenant `acme-corp` throttled at `2023-10-27T10:00:00Z`. Request: 150 tokens, Limit: 100."

## 2. Baseline Comparison (Deltas)

To understand impact, we calculate `deltas` against a baseline (usually the current state or a multiplier of 1.0).

*   **Utilization Change**: How much did peak usage grow?
*   **Limit Change**: How much was the budget constrained?

## 3. Confidence Scores

Not all simulations are equal. We provide a `confidenceScore` (0.0 - 1.0) based on data quality:

*   **High (0.8 - 1.0)**: Full historical data available, deterministic calculation.
*   **Medium (0.5 - 0.7)**: Some data interpolated or estimated.
*   **Low (< 0.5)**: Missing historical data, relying on defaults or empty sets.

## 4. Immutable Receipts (Future)

In future sprints, simulation results will be cryptographically signed and stored as "Receipts" in the Provenance Ledger to demonstrate due diligence in decision-making.
