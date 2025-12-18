import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RunbookEngine } from '../engine/RunbookEngine.js';
import { RunbookDefinition, RunbookStep, RunbookContext } from '../lib/types.js';

// Mock provenance ledger
jest.mock('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn<any>().mockResolvedValue({ id: 'mock-entry' }),
    getEntries: jest.fn<any>().mockResolvedValue([]),
  }
}));

// Mock Step
class MockStep implements RunbookStep {
  async execute(context: RunbookContext, parameters: Record<string, any>): Promise<any> {
    return { executed: true, params: parameters };
  }
}

describe('Runbook Engine', () => {
  let engine: RunbookEngine;
  const mockDef: RunbookDefinition = {
    id: 'test-runbook',
    name: 'Test Runbook',
    description: 'Test',
    version: '1.0',
    triggers: [],
    inputs: { input1: 'Input 1' },
    outputs: {},
    steps: [
      {
        id: 'step1',
        name: 'Step 1',
        type: 'mock',
        parameters: { param1: '{{inputs.input1}}' }
      }
    ]
  };

  beforeEach(() => {
    engine = new RunbookEngine();
    engine.registerStep('mock', new MockStep());
    engine.registerDefinition(mockDef);
  });

  it('should list definitions', () => {
    const definitions = engine.listDefinitions();
    expect(definitions).toHaveLength(1);
    expect(definitions[0].id).toBe('test-runbook');
  });

  it('should execute a runbook', async () => {
    const runId = await engine.executeRunbook(
      'test-runbook',
      { input1: 'value1' },
      'user1',
      'tenant1'
    );

    expect(runId).toBeDefined();

    // Wait for async execution
    await new Promise(resolve => engine.on('runbookCompleted', resolve));

    const status = engine.getStatus(runId);
    expect(status.logs).toHaveLength(1);
    expect(status.logs[0].stepId).toBe('step1');
    expect(status.logs[0].result.params.param1).toBe('value1');
  });

  it('should interpolate variables correctly', async () => {
      // Tested implicitly in previous test
  });

  it('should handle missing definition', async () => {
    await expect(engine.executeRunbook('missing', {}, 'u', 't')).rejects.toThrow();
  });
});
