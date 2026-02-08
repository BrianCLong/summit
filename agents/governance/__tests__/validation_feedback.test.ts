import { describe, it, expect, vi } from 'vitest';
import {
  AgentPolicyEngine,
  PromptChainOrchestrator,
  type AgentPolicyContext,
  type PromptChain,
  type LLMProviderAdapter,
  type LLMExecutionResult,
  type LLMExecutionOptions,
} from '../src';

const createMockContext = (): AgentPolicyContext => ({
  agentId: 'agent-001',
  fleetId: 'fleet-001',
  sessionId: 'session-001',
  trustLevel: 'elevated',
  classification: 'CONFIDENTIAL',
  capabilities: ['read', 'analyze'],
  requestedAction: 'analyze_data',
  targetResource: 'entity:12345',
  userContext: {
    userId: 'user-001',
    roles: ['analyst'],
    clearance: 'SECRET',
    organization: 'org-001',
  },
  environmentContext: {
    timestamp: Date.now(),
    airgapped: false,
    federalEnvironment: true,
    slsaLevel: 'SLSA_3',
  },
});

class MockProvider implements LLMProviderAdapter {
  id = 'test-provider';
  provider = {
    id: 'test-provider',
    name: 'Test Provider',
    endpoint: 'http://localhost',
    model: 'test-model',
    capabilities: ['chat'],
    costPerToken: 0.001,
    latencyMs: 100,
    trustLevel: 'elevated',
  } as any;

  calls: string[] = [];

  async execute(
    prompt: string,
    systemPrompt: string | undefined,
    options: LLMExecutionOptions
  ): Promise<LLMExecutionResult> {
    this.calls.push(prompt);

    // Check if prompt contains feedback about invalid JSON
    if (prompt.includes('Validation errors:') && prompt.includes('Invalid JSON schema')) {
      return {
        output: '{"result": "success"}',
        inputTokens: 10,
        outputTokens: 5,
        latencyMs: 50,
        modelId: 'test-model',
        finishReason: 'stop',
      };
    }

    // Default: return invalid JSON
    return {
      output: 'Invalid JSON here',
      inputTokens: 10,
      outputTokens: 5,
      latencyMs: 50,
      modelId: 'test-model',
      finishReason: 'stop',
    };
  }

  estimateCost(input: number, output: number) { return 0.01; }
  async checkHealth() { return true; }
}

describe('Validation Feedback Loop', () => {
  it('should retry with feedback when validation fails', async () => {
    const policyEngine = new AgentPolicyEngine({ failSafe: 'allow' }); // Allow all for simplicity
    // Hack: mocking evaluateChain to always allow
    vi.spyOn(policyEngine, 'evaluateChain').mockResolvedValue({
      allow: true,
      reason: 'Allowed',
      policyPath: 'root',
      auditLevel: 'info',
    });

    const orchestrator = new PromptChainOrchestrator(policyEngine, {
        maxValidationRetries: 3
    });

    const provider = new MockProvider();
    orchestrator.registerProvider(provider);

    const chain: PromptChain = {
      id: 'chain-001',
      name: 'Test Chain',
      description: 'Test',
      steps: [
        {
          id: 'step-1',
          sequence: 1,
          llmProvider: 'test-provider',
          prompt: {
            template: 'Generate JSON',
            variables: [],
            maxTokens: 100,
            temperature: 0,
            classification: 'UNCLASSIFIED',
          },
          inputMappings: {},
          outputMappings: {},
          validations: [
            { type: 'schema', config: {}, action: 'remediate' }
          ],
          timeout: 1000,
          retryPolicy: { maxRetries: 0, backoffMs: 0, backoffMultiplier: 1, retryableErrors: [] },
        },
      ],
      governance: {
        requiredApprovals: [],
        maxCostPerExecution: 100,
        maxDurationMs: 60000,
        allowedClassifications: ['UNCLASSIFIED'],
        auditLevel: 'standard',
        incidentEscalation: [],
      },
      provenance: {
        createdBy: 'test',
        createdAt: new Date(),
        version: '1.0',
        slsaLevel: 'SLSA_0',
        attestations: [],
      },
      metadata: {},
    };

    const result = await orchestrator.executeChain({
      chain,
      inputs: {},
      context: createMockContext(),
    });

    // Expect success because the feedback loop should have fixed it
    expect(result.success).toBe(true);
    expect(result.steps[0].output).toEqual({ result: 'success' });
    expect(provider.calls.length).toBe(2);
    expect(provider.calls[1]).toContain('Validation errors:');
  });
});
