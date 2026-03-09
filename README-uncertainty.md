# Uncertainty Control Plane

The Uncertainty Control Plane is a core mechanism in Summit for managing the reliability of multi-agent systems. It introduces an explicit schema and lifecycle for epistemic and aleatoric uncertainty, enabling policy-driven adaptations to agent execution.

## Key Concepts

- **Epistemic Uncertainty**: Uncertainty arising from a lack of knowledge or information. This can potentially be reduced by gathering more data, utilizing more capable agents, or using multi-agent debate.
- **Aleatoric Uncertainty**: Inherent randomness or unpredictability in the task or environment.
- **Diverse Agent Entropy**: A measure of disagreement or varied perspectives among multiple agents analyzing the same claim or task.

## Components

### `UncertaintyRecord` (Types)

The `UncertaintyRecord` interface (`src/types/uncertainty.ts`) defines the core schema for tracking uncertainty state across entities like Tasks, Claims, and AgentRuns.

It tracks:
- `lifecycle`: The current phase ('representation', 'identification', 'evolution', 'adaptation')
- `metrics`: Current values for `epistemic`, `aleatoric`, and `diverseAgentEntropy`
- `sensors`: A history of evidence or data that influenced the uncertainty metrics
- `actions`: Policy-driven adaptations that have been triggered

### `UncertaintyRegistry`

The `UncertaintyRegistry` (`src/services/UncertaintyRegistry.ts`) is a service for managing the lifecycle of `UncertaintyRecord`s.

- `attachToEntity`: Initializes uncertainty tracking for a new entity.
- `estimateUncertainty`: Analyzes output using specified methods ('logits', 'multiAgentVote', 'debateScore') to produce uncertainty metrics.
- `evolveState`: Updates the uncertainty record with new evidence, transitioning it through the lifecycle phases.

### `PolicyEngine`

The `PolicyEngine` (`src/services/PolicyEngine.ts`) evaluates `UncertaintyRecord`s against a set of rules and triggers appropriate `UncertaintyAction`s.

- `evaluatePolicy`: Checks a record against all rules and returns triggered actions (e.g., 'spawnDebateAgents', 'humanEscalate').
- `executeWithUncertaintyWrap`: A wrapper for `Maestro Conductor` or other orchestrators that integrates policy evaluation directly into the agent execution loop, allowing for pre-flight blocking or dynamic adaptation.

## Integration Guide for Narrative Pipelines

1.  **Initialize Registry and Policy Engine**
    ```typescript
    import { UncertaintyRegistry } from './services/UncertaintyRegistry';
    import { PolicyEngine } from './services/PolicyEngine';

    const registry = new UncertaintyRegistry();
    const policyEngine = new PolicyEngine();
    ```

2.  **Attach to Claims**
    When a new narrative claim is ingested, attach an uncertainty record:
    ```typescript
    const claim = { id: 'claim-123', type: 'Claim', statement: 'Iran regime stability post-blackout' };
    let record = registry.attachToEntity(claim, {
      lifecycle: 'representation',
      metrics: { epistemic: 0.5, aleatoric: 0.2, diverseAgentEntropy: 0.1 },
      sensors: [],
      actions: []
    });
    ```

3.  **Wrap Agent Execution**
    When an agent analyzes the claim, wrap the execution to apply policies:
    ```typescript
    const agentRun = { id: 'run-1', type: 'AgentRun' };

    try {
      const result = await policyEngine.executeWithUncertaintyWrap(
        agentRun,
        record,
        async () => {
          // ... your agent logic here ...
          return { analysis: '...' };
        },
        (actions) => {
          // Handle dynamic adaptation (e.g., if 'requireMultiAgentDebate' is triggered)
          console.log('Adaptation required:', actions);
          // Launch additional agents...
        }
      );

      // Update record with results
      record = registry.evolveState(record, result);
    } catch (error) {
      // Handle blocked execution (e.g., 'humanEscalate')
      console.error('Execution blocked by policy:', error);
    }
    ```

## Running Tests

```bash
pnpm test tests/services/uncertainty-control-plane.test.ts
```
