
# PRD: Project Pythia (Cognitive / Predictive Intelligence)


## 1. Executive Summary
Project Pythia adds a "Counterfactual Simulation Layer" to the Summit platform. It moves beyond simple threat forecasting by allowing analysts to simulate "what-if" scenarios (e.g., "If we take down Node X, how does the influence network re-route?").


## 2. Problem Statement
Current tools in Summit (`PredictiveThreatService`) provide static forecasts based on historical data. They fail to predict how adaptive adversaries react to our interventions, leading to "whack-a-mole" operations.


## 3. Non-Goals



- Real-time molecular dynamics simulation.
- Replacing the core `PredictiveThreatService` (Pythia wraps it).


## 4. User Stories



- As an analyst, I want to simulate the takedown of a botnet command node to see predicted network healing time.
- As a strategist, I want to compare three different intervention packages to minimize collateral damage.


## 5. Functional Requirements



- `simulateIntervention(scenario: Scenario): SimulationResult`
- Support for `NodeRemoval`, `EdgeWeightChange`, and `ContentInjection` tactics.
- Probabilistic outcome scoring (Confidence Intervals).


## 6. Non-Functional Requirements



- Simulation runtime < 5s for subgraphs < 10k nodes.
- Deterministic seeding for reproducibility.


## 7. Architecture



- Extends `PredictiveThreatService`.
- Uses a temporary in-memory graph overlay (copy-on-write) to apply mutations without affecting the live graph.
- Monte Carlo variation for confidence bounds.


## 8. Data Flows
User Request -> PythiaService -> Graph Snapshot -> Mutation -> Predictive Model -> Aggregated Result.


## 9. Policy & Governance



- Simulations must be logged in `AuditLog` with `is_simulation=true`.
- Access restricted to `analyst` role or higher.


## 10. Test Strategy



- Unit tests for graph mutation logic.
- Integration test with mock Predictive Model.


## 11. Rollout



- Feature flagged `pythia_enabled`.
- Deploy to "Shadow" mode first.


## 12. Risks



- Compute cost of simulations. Mitigation: Rate limiting and max subgraph size.


## 13. Success Metrics



- % of interventions that match simulated outcomes within 20% error margin.
