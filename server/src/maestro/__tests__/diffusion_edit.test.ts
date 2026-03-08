import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MaestroHandlers } from '../handlers';
import { MaestroTask } from '../model';
import { DiffusionCoderAdapter } from '../adapters/diffusion_coder';

describe('Diffusion Edit Flow (Functional)', () => {
  let handlers: MaestroHandlers;
  let mockEngine: any;
  let mockAgentService: any;
  let mockLLM: any;
  let mockGraph: any;
  let diffusionCoder: DiffusionCoderAdapter;

  beforeEach(() => {
    mockEngine = {
      registerTaskHandler: jest.fn(),
      createRun: jest.fn()
    };
    mockAgentService = {
      getAgent: jest.fn()
    };
    mockLLM = {
      callCompletion: jest.fn().mockResolvedValue({
        content: 'export function fix() { return true; }',
        usage: { total_tokens: 50 }
      })
    };
    mockGraph = {
      executeAlgorithm: jest.fn()
    };

    diffusionCoder = new DiffusionCoderAdapter(mockLLM);

    handlers = new MaestroHandlers(
      mockEngine,
      mockAgentService,
      mockLLM,
      mockGraph,
      diffusionCoder
    );
  });

  it('should register diffusion_edit handler', () => {
    handlers.registerAll();
    expect(mockEngine.registerTaskHandler).toHaveBeenCalledWith('diffusion_edit', expect.any(Function));
  });

  it('should execute functional diffusion edit and call LLM for each step and block', async () => {
    const task: MaestroTask = {
      id: 'task-123',
      runId: 'run-456',
      tenantId: 'tenant-789',
      name: 'Fix bug',
      kind: 'diffusion_edit',
      status: 'running',
      dependsOn: [],
      attempt: 1,
      maxAttempts: 3,
      backoffStrategy: 'fixed',
      payload: {
        prompt: 'Fix the null pointer exception in user service',
        steps: 2,
        block_length: 2
      },
      metadata: {}
    };

    handlers.registerAll();
    const handler = (mockEngine.registerTaskHandler as jest.Mock).mock.calls.find(call => call[0] === 'diffusion_edit')![1];

    const result = await handler(task);

    expect(result).toBeDefined();
    expect(result.patch).toContain('fix');
    expect(mockLLM.callCompletion).toHaveBeenCalled();
    // 2 steps * 2 blocks = 4 calls
    expect(mockLLM.callCompletion).toHaveBeenCalledTimes(4);
    expect(result.uncertaintyMap).toBeDefined();
    expect(result.policyVerdicts).toBeDefined();
    expect(result.policyVerdicts.length).toBeGreaterThanOrEqual(4);
    expect(result.stats.llmCalls).toBe(4);
  });
});
