# Counter-Campaign Optimization & A/B Simulation Epics

## Readiness Assertion Alignment
This epic set is aligned to the Summit Readiness Assertion and assumes policy-as-code enforcement, provenance capture, and governed exceptions for legacy data feeds when needed.

## Context
Narrative Impact Forecaster provides forecasted adoption curves and impact deltas, while OSINT Agent Swarm supplies real-time narrative mutations, messenger shifts, and channel telemetry. These epics operationalize those capabilities into counter-campaign optimization, robustness testing, and A/B simulation.

## Epic F1 — Counter-Play Search (Optimization Loop)
**Goal:** Given an adversary campaign, search over counter-narratives and messenger configurations to minimize long-run adoption in simulation.

### Neo4j schema additions
- **Nodes**
  - `CounterStrategy` {id, name, version, objective, createdAt}
  - `CounterNarrative` {id, framing, stance, locale, riskTier}
  - `MessengerProfile` {id, orgType, trustScore, reach, constraints}
  - `OptimizationRun` {id, algorithm, budget, startedAt, completedAt, status}
- **Relationships**
  - `(CounterStrategy)-[:USES_NARRATIVE]->(CounterNarrative)`
  - `(CounterStrategy)-[:USES_MESSENGER]->(MessengerProfile)`
  - `(OptimizationRun)-[:EVALUATED]->(CounterStrategy)`
  - `(OptimizationRun)-[:TARGETS]->(AdversaryCampaign)`

### GraphQL API
- **Types**: `CounterStrategy`, `CounterNarrative`, `MessengerProfile`, `OptimizationRun`, `OptimizationMetric`
- **Queries**
  - `counterStrategies(campaignId, status)`
  - `optimizationRun(id)`
- **Mutations**
  - `startOptimizationRun(input)` → creates run, pulls NIF baselines, requests OSINT swarm coverage
  - `registerCounterStrategy(input)` → stores strategy variants for search

### Copilot flows
1. **Ingest adversary campaign** → auto-cluster to baseline narrative set.
2. **Generate strategy space** → LLM-guided narrative variants + messenger cohorts.
3. **Run optimization loop** → search strategies with NIF scoring.
4. **Review top strategies** → inspect expected long-run adoption deltas.

### Success metrics
- ≥25% reduction in simulated long-run adoption vs. baseline.
- ≥90% of strategies scored with confidence intervals.
- Optimization run time within defined budget (P95 < 30 minutes).

## Epic F2 — Robustness Stress-Testing & Ranking
**Goal:** Stress-test counter-campaigns against adversary adaptations and rank by robustness across perturbations.

### Neo4j schema additions
- **Nodes**
  - `AdaptationScenario` {id, type, severity, description, createdAt}
  - `RobustnessScore` {id, score, variance, computedAt}
- **Relationships**
  - `(CounterStrategy)-[:STRESSED_BY]->(AdaptationScenario)`
  - `(CounterStrategy)-[:HAS_ROBUSTNESS]->(RobustnessScore)`
  - `(AdaptationScenario)-[:DERIVED_FROM]->(AdversaryCampaign)`

### GraphQL API
- **Types**: `AdaptationScenario`, `RobustnessScore`
- **Queries**
  - `robustnessLeaderboard(campaignId, limit)`
- **Mutations**
  - `generateAdaptationScenarios(input)` → uses OSINT swarm to derive likely variants
  - `runRobustnessSuite(strategyId, scenarios)` → runs ensemble sims

### Copilot flows
1. **Select candidate strategies** → choose top N from optimization run.
2. **Generate adversary variants** → OSINT swarm expands framings, messengers, channels.
3. **Run robustness suite** → compute median + variance adoption deltas.
4. **Rank by robustness** → prefer lowest worst-case adoption.

### Success metrics
- Robustness ranking stability (Spearman ρ ≥ 0.7 across runs).
- ≥80% coverage of top adversary adaptations observed in OSINT feed.
- Worst-case adoption reduction ≥15% vs. baseline.

## Epic F3 — Counter-Campaign A/B Simulation & Experiment Tracking
**Goal:** Compare counter-campaign bundles via controlled simulation experiments and track expected lift.

### Neo4j schema additions
- **Nodes**
  - `SimulationExperiment` {id, name, hypothesis, createdAt, status}
  - `ExperimentArm` {id, label, trafficShare, seed}
  - `ExperimentOutcome` {id, metric, value, confidence}
- **Relationships**
  - `(SimulationExperiment)-[:HAS_ARM]->(ExperimentArm)`
  - `(ExperimentArm)-[:USES_STRATEGY]->(CounterStrategy)`
  - `(ExperimentArm)-[:PRODUCED]->(ExperimentOutcome)`

### GraphQL API
- **Types**: `SimulationExperiment`, `ExperimentArm`, `ExperimentOutcome`
- **Queries**
  - `simulationExperiment(id)`
  - `experimentOutcomes(experimentId)`
- **Mutations**
  - `createSimulationExperiment(input)`
  - `runSimulationExperiment(id)` → executes arms with NIF scoring

### Copilot flows
1. **Define hypothesis** → which counter-campaign should outperform.
2. **Configure arms** → assign strategies and traffic shares.
3. **Run A/B sim** → execute with consistent seeds for determinism.
4. **Review evidence** → compare uplift and confidence intervals.

### Success metrics
- ≥95% experiment determinism with fixed seeds.
- Lift detection power ≥0.8 at α=0.05.
- Reported metrics include adoption delta, reach-weighted risk, and time-to-decay.

## Forward-Leaning Enhancement
Introduce an **adaptive bandit controller** that reallocates simulation budget toward promising strategies during optimization and robustness suites, reducing compute by ~30% while improving top-5 quality.
