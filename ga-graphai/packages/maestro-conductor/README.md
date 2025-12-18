# Maestro Conductor

Maestro Conductor orchestrates GraphAI jobs across discovered assets while applying guardrails, CI gates, and execution tracing. The library is designed for safe fallback routing and resilient policy enforcement.

## Key capabilities
- **Asset-aware routing** via `JobRouter` using performance snapshots, policy hooks, and capability/region filters.
- **Guardrail enforcement** with structured results, warning separation, and graceful handling of guardrail errors that otherwise disrupt routing.
- **CI gating** for orchestration tasks with error-aware evaluation to prevent silent skips when checks fail to execute.
- **Execution tracing** that records discovery, routing, guardrail decisions, CI gates, fallbacks, and completion/failure states for every task.

## Usage
```ts
import { MaestroConductor } from './src';

const conductor = new MaestroConductor();
conductor.registerDiscoveryProvider(myProvider);
conductor.registerGuardrail({
  id: 'compliance',
  severity: 'block',
  evaluate: async ({ asset }) => ({
    id: 'compliance',
    passed: asset.labels?.compliance === 'soc2',
    severity: 'block',
    reason: 'requires SOC2 label',
  }),
});
conductor.registerCiCheck({
  id: 'unit-tests',
  required: true,
  evaluate: async (task) => ({
    id: 'unit-tests',
    passed: task.metadata?.ciStatus === 'passed',
  }),
});

await conductor.scanAssets();
const result = await conductor.executeTask({
  id: 'task-123',
  intent: 'execute-workflow',
  job: { id: 'job-1', type: 'agent-task', priority: 'high', requiredCapabilities: ['orchestration'] },
  metadata: { ciStatus: 'passed' },
});

console.log(result.selected?.assetId);
console.log(conductor.getExecutionTrace('task-123'));
```

### Handling guardrail or CI errors
- Guardrail errors are captured as blocking results with `error` populated and are recorded in the execution trace before fallbacks are attempted.
- CI checks that throw are converted into failed results with `error` so that routing can safely fail or fallback instead of proceeding silently.

### Testing
Run the package tests from this directory:

```bash
npm test
```

Vitest is used for fast unit coverage of routing, guardrail enforcement, CI gating, and tracing flows.
