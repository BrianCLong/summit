import {
  GuidedWorkflowOrchestrator,
  InMemoryToolRegistry,
} from '../src/guidedWorkflowOrchestrator';
import { GuidedWorkflowBlueprint } from '../src/guidedWorkflowBlueprint';

describe('Guided workflow integration', () => {
  const registry = new InMemoryToolRegistry();
  registry.register('extractor', async () => ({
    output: { rows: [{ id: 1, name: 'Ada' }] },
  }));
  registry.register('normalizer', async (input) => ({
    output: {
      normalized: (input.rows as any[]).map((row) => ({
        ...row,
        name: String(row.name).toLowerCase(),
      })),
    },
  }));
  registry.register('resolver', async (input) => ({
    output: {
      resolved: (input.normalized as any[]).map((row) => ({
        ...row,
        entityId: `ent-${row.id}`,
      })),
      artifacts: ['resolver.log'],
    },
    debugLog: 'deduplicated 1 records',
  }));
  registry.register('graph-writer', async (input) => ({
    output: { graphIngested: (input.resolved as any[]).length },
    artifacts: ['graph.csv'],
  }));

  const blueprint: GuidedWorkflowBlueprint = {
    metadata: {
      id: 'integration-flow',
      name: 'Integration Flow',
      description: 'End-to-end demo',
      risk_level: 'low',
      tags: ['demo'],
    },
    steps: [
      {
        id: 'extract',
        title: 'Extract',
        description: 'Extract rows',
        prompt: 'extract',
        tool: { tool_id: 'extractor', input_mapping: {}, output_mapping: {} },
        retries: 0,
      },
      {
        id: 'normalize',
        title: 'Normalize',
        description: 'Normalize rows',
        prompt: 'normalize',
        tool: { tool_id: 'normalizer', input_mapping: {}, output_mapping: {} },
        retries: 0,
      },
      {
        id: 'resolve',
        title: 'Resolve',
        description: 'Resolve entities',
        prompt: 'resolve',
        tool: { tool_id: 'resolver', input_mapping: {}, output_mapping: {} },
        retries: 0,
      },
      {
        id: 'ingest',
        title: 'Ingest',
        description: 'Ingest graph',
        prompt: 'ingest',
        tool: { tool_id: 'graph-writer', input_mapping: {}, output_mapping: {} },
        retries: 0,
        stop_condition: 'graphIngested',
      },
    ],
  };

  it('executes all steps and emits artifacts', async () => {
    const orchestrator = new GuidedWorkflowOrchestrator(registry, {
      featureFlags: { guidedWorkflows: { enabled: true } },
      maxRetries: 1,
    });

    const run = await orchestrator.run(blueprint);

    expect(run.status).toBe('succeeded');
    expect(run.outputs.graphIngested).toBe(1);
    expect(run.artifacts).toContain('graph.csv');
    expect(run.actionTrace.some((e) => e.type === 'STEP_COMPLETED')).toBe(true);
  });
});
