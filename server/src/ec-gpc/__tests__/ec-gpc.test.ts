
import { GraphPolicyCompiler } from '../policy-compiler.js';
import { PolicyRuntime } from '../policy-runtime.js';
import { CompileRequest, PolicyGoal } from '../types.js';

// Mock dependencies
jest.mock('../../maestro/provenance/intel-graph.js', () => ({
  intelGraphService: {
    pushEvidence: jest.fn().mockResolvedValue(undefined)
  },
  IntelGraphService: jest.fn()
}));

describe('Envelope-Constrained Graph Policy Compilation', () => {
  let compiler: GraphPolicyCompiler;
  let runtime: PolicyRuntime;

  beforeEach(() => {
    compiler = new GraphPolicyCompiler();
    runtime = new PolicyRuntime();
    jest.clearAllMocks();
  });

  const baseGoal: PolicyGoal = {
    id: 'test-goal',
    description: 'Summarize the provided context.',
    taskType: 'generation'
  };

  test('Compiles a policy with constraints', () => {
    const request: CompileRequest = {
      goal: baseGoal,
      constraints: { maxLatencyMs: 1000 }
    };

    const response = compiler.compile(request);

    expect(response.policy).toBeDefined();
    expect(response.policy.nodes.length).toBeGreaterThan(0);
    expect(response.policy.globalEnvelope.latencyMs).toBe(1000);

    // Check envelope allocation
    response.policy.nodes.forEach(node => {
        expect(node.envelope.latencyMs).toBeGreaterThan(0);
    });
  });

  test('Selects different template based on constraints (Private)', () => {
    const request: CompileRequest = {
      goal: baseGoal,
      constraints: { noExternalCalls: true }
    };

    const response = compiler.compile(request);
    const nodes = response.policy.nodes;

    // Should select local/cache path
    const hasLocalLLM = nodes.some(n => n.assetRef === 'local-llama');
    const hasGPT = nodes.some(n => n.assetRef.includes('gpt'));

    expect(hasLocalLLM).toBe(true);
    expect(hasGPT).toBe(false);
  });

  test('Runtime executes policy and logs trace', async () => {
    // 1. Compile
    const request: CompileRequest = {
      goal: baseGoal,
      constraints: { maxLatencyMs: 5000 }
    };
    const { policy } = compiler.compile(request);

    // 2. Execute
    const input = { data: 'Some text to summarize' };
    const trace = await runtime.execute(policy, input);

    expect(trace.status).toBe('completed');
    expect(trace.steps.length).toBe(policy.nodes.length);
    expect(trace.totalDurationMs).toBeGreaterThan(0);
  });
});
