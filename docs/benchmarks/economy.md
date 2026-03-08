# Economy Market Simulation Benchmarks

## Overview
The Economy Benchmark pack assesses AI agents interacting in resource-constrained environments that simulate markets. It evaluates how agents buy, sell, trade, and specialize over long horizons.

## Metrics
- **Innovation Rate**: New tools or insights discovered per agent per step.
- **Economic Efficiency**: Pareto improvements achieved through trade.
- **Specialization Index**: The degree to which agents focus on specific capabilities (e.g., research, manufacturing).

## Architecture
- `EconomyRunConfig`: Adds `marketSize`, `initialCapital`, and `transactionPolicy` (trade constraints) to standard configs.
- `runEconomy`: Orchestrates simultaneous `act()` calls across multiple agents and combines them into `market_step` environment transitions.
