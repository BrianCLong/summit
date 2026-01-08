# Cross-Domain Simulation Engine

## 1. Architecture

The Cross-Domain Simulation Engine is a deterministic, composable system designed to project future states based on multi-variable inputs.

### 1.1. Core Components

- **Engine**: Orchestrates the simulation loop, manages state, and enforces invariants.
- **Model Registry**: Repository of domain-specific logic modules.
- **State Manager**: Handles the mutation of simulation state across time slices.

### 1.2. Simulation Loop

1.  **Initialize**: Load scenario config and initial state.
2.  **Time Step Loop**:
    - **Apply External Events**: Triggers defined in the scenario (e.g., "Year 2: Regulation X passes").
    - **Run Domain Models**: Execute Cost, Reliability, etc., models in dependency order.
    - **Resolve Interactions**: Handle cross-domain feedback.
    - **Check Invariants**: Verify constraints.
    - **Commit State**: Save snapshot for current time slice.
3.  **Finalize**: Aggregate results and generate report.

## 2. Composable Models

### 2.1. Cost Model

- **Inputs**: Tenant count, Data volume, Autonomy tier, Infrastructure unit costs.
- **Outputs**: OPEX, CAPEX, Unit Economics.
- **Logic**: Projects costs based on growth curves and efficiency modifiers from autonomy.

### 2.2. Reliability Model

- **Inputs**: Scale, Autonomy level, Incident rate baseline.
- **Outputs**: SLA availability, Incident volume, MTTR.
- **Logic**: Models risk probability distributions and recovery capabilities.

### 2.3. Autonomy Exposure Model

- **Inputs**: Allowed tiers, Task complexity.
- **Outputs**: % of tasks automated, Error rates, Intervention costs.
- **Logic**: Simulates the adoption and performance of autonomous agents.

### 2.4. Regulatory Constraint Model

- **Inputs**: Active regimes (EU AI Act, GDPR, etc.), Compliance strictness.
- **Outputs**: Compliance cost overhead, blocked autonomy tiers, data residency requirements.
- **Logic**: Acts as a filter and cost multiplier.

## 3. Deterministic Replay

The engine is stateless and deterministic.

- Same Inputs + Same Seed = Same Outputs.
- No dependency on live database state (unless explicitly snapshotting initial state).
- Mockable random number generation for probabilistic models.

## 4. Integration

The engine exposes a TypeScript API:

```typescript
runSimulation(scenario: ScenarioDefinition): SimulationResult
```

This allows integration into the web UI for interactive scenario planning.
