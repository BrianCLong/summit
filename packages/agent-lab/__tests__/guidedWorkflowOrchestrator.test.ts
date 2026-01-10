import fs from 'fs';
import os from 'os';
import path from 'path';

import { ContentBoundary } from '../src/contentBoundary';
import { GuidedWorkflowBlueprint, validateBlueprint } from '../src/guidedWorkflowBlueprint';
import { GuidedWorkflowOrchestrator } from '../src/guidedWorkflowOrchestrator';
import { ToolDefinition } from '../src/tools';

describe('Guided workflow blueprint validation', () => {
  it('parses metadata, steps, and policies', () => {
    const spec: GuidedWorkflowBlueprint = validateBlueprint({
      metadata: {
        id: 'sample',
        name: 'Sample workflow',
        description: 'Test blueprint',
        risk_level: 'low',
        tags: ['demo'],
      },
      steps: [
        {
          id: 'collect',
          title: 'Collect inputs',
          prompt: 'Provide inputs',
          inputSchema: { type: 'object', properties: { url: { type: 'string' } } },
          tool: { toolId: 'noop', inputMapping: {} },
        },
      ],
    });

    expect(spec.metadata.id).toBe('sample');
    expect(spec.policies.maxAttempts).toBeGreaterThan(0);
    expect(spec.steps[0].title).toBe('Collect inputs');
  });
});

describe('GuidedWorkflowOrchestrator', () => {
  const makeTool = (name: string): ToolDefinition => ({
    name,
    version: '0.0.1',
    description: 'mock tool',
    async execute(inputs) {
      return { output: { ...inputs, status: 'ok' }, notes: 'mock-run' };
    },
  });

  it('runs steps with validation, evidence, and trace output', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guided-wf-'));
    const blueprint = validateBlueprint({
      metadata: {
        id: 'demo',
        name: 'Demo',
        description: 'End-to-end test blueprint',
        risk_level: 'medium',
        tags: ['test'],
      },
      steps: [
        {
          id: 'ingest',
          title: 'Ingest',
          prompt: 'Provide url',
          inputSchema: {
            type: 'object',
            required: ['url'],
            properties: { url: { type: 'string', format: 'uri' } },
          },
          tool: { toolId: 'http_head', inputMapping: { url: 'url' }, retries: 1 },
        },
      ],
      policies: { maxAttempts: 2, allowDebug: true, redactKeys: ['secret'] },
    });

    const orchestrator = new GuidedWorkflowOrchestrator({
      blueprint,
      runId: 'demo-run',
      boundary: new ContentBoundary(),
      artifactsDir: tmpDir,
      tools: [makeTool('http_head')],
      userInputs: { ingest: { url: 'https://example.com' } },
      featureEnabled: true,
    });

    const result = await orchestrator.run();

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].status).toBe('allowed');
    expect(result.actionTracePath.endsWith('trace.ndjson')).toBe(true);
    expect(fs.existsSync(result.actionTracePath)).toBe(true);
    const runSummaryPath = path.join(tmpDir, 'runs', 'demo-run', 'run.json');
    expect(fs.existsSync(runSummaryPath)).toBe(true);
  });
});
