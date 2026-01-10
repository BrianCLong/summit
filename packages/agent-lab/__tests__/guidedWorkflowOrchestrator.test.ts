import {
  GuidedWorkflowOrchestrator,
  InMemoryToolRegistry,
  loadGuidedWorkflowBlueprint,
} from '../src';

const blueprint = {
  metadata: {
    id: 'test-flow',
    name: 'Test Flow',
    description: 'Simple workflow for testing',
    risk_level: 'low',
    tags: ['test'],
  },
  steps: [
    {
      id: 'collect',
      title: 'Collect Input',
      description: 'Collects user input',
      prompt: 'Provide name',
      input: {
        prompt: 'Provide name',
        schema: { name: { type: 'string' } },
      },
    },
    {
      id: 'transform',
      title: 'Transform',
      description: 'Uppercase name',
      prompt: 'Uppercase the name',
      tool: {
        tool_id: 'uppercase',
        input_mapping: { value: 'name' },
        output_mapping: { transformed: 'result' },
      },
      retries: 1,
    },
  ],
};

describe('GuidedWorkflowOrchestrator', () => {
  it('runs a workflow and records trace', async () => {
    const registry = new InMemoryToolRegistry();
    registry.register('uppercase', async (input) => {
      return {
        output: {
          result: String(input.value || '').toUpperCase(),
        },
        debugLog: 'ok',
      };
    });

    const orchestrator = new GuidedWorkflowOrchestrator(registry, {
      featureFlags: { guidedWorkflows: { enabled: true } },
    });

    const run = await orchestrator.run(blueprint as any, { name: 'alice' });

    expect(run.status).toBe('succeeded');
    expect(run.outputs.transformed).toBe('ALICE');
    expect(run.toolCalls[0].inputKeys).toContain('value');
    expect(run.actionTrace.length).toBeGreaterThanOrEqual(2);
  });

  it('loads YAML blueprints and enforces feature flag', () => {
    const registry = new InMemoryToolRegistry();
    const file = `${__dirname}/fixtures/data-extract.yaml`;
    const loaded = loadGuidedWorkflowBlueprint(file);
    expect(loaded.metadata.id).toBe('data-extraction-normalize-graph');
    const orchestrator = new GuidedWorkflowOrchestrator(registry, {
      featureFlags: { guidedWorkflows: { enabled: false } },
    });
    return expect(orchestrator.run(loaded as any)).rejects.toThrow(
      /disabled/
    );
  });
});
