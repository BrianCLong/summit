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
  failUntilCall = 0;

  constructor(failCount = 0) {
      this.failUntilCall = failCount;
  }

  async execute(
    prompt: string,
    systemPrompt: string | undefined,
    options: LLMExecutionOptions
  ): Promise<LLMExecutionResult> {
    this.calls.push(prompt);

    // If we've passed the failure threshold, succeed
    if (this.calls.length > this.failUntilCall) {
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
  it('should retry with feedback when validation fails with action: remediate', async () => {
    const policyEngine = new AgentPolicyEngine({ failSafe: 'allow' });
    vi.spyOn(policyEngine, 'evaluateChain').mockResolvedValue({
      allow: true,
      reason: 'Allowed',
      policyPath: 'root',
      auditLevel: 'info',
    });

    const orchestrator = new PromptChainOrchestrator(policyEngine, {
        maxValidationRetries: 3
    });

    const provider = new MockProvider(1); // Fail once
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

    expect(result.success).toBe(true);
    expect(result.steps[0].output).toEqual({ result: 'success' });
    expect(provider.calls.length).toBe(2);
    // Provider calls are not modified by append, but prompt argument is.
    // Wait, provider.execute receives the prompt string.
    expect(provider.calls[1]).toContain('Validation errors:');
  });

  it('should fail immediately when validation fails with action: reject', async () => {
    const policyEngine = new AgentPolicyEngine({ failSafe: 'allow' });
    vi.spyOn(policyEngine, 'evaluateChain').mockResolvedValue({
      allow: true,
      reason: 'Allowed',
      policyPath: 'root',
      auditLevel: 'info',
    });

    const orchestrator = new PromptChainOrchestrator(policyEngine, {
        maxValidationRetries: 3
    });

    const provider = new MockProvider(5); // Fail always
    orchestrator.registerProvider(provider);

    const chain: PromptChain = {
      id: 'chain-reject',
      name: 'Test Chain Reject',
      description: 'Test',
      steps: [
        {
          id: 'step-1',
          sequence: 1,
          llmProvider: 'test-provider',
          prompt: { template: 'Generate JSON', variables: [], maxTokens: 100, temperature: 0, classification: 'UNCLASSIFIED' },
          inputMappings: {}, outputMappings: {},
          validations: [
            { type: 'schema', config: {}, action: 'reject' }
          ],
          timeout: 1000,
          retryPolicy: { maxRetries: 0, backoffMs: 0, backoffMultiplier: 1, retryableErrors: [] },
        },
      ],
      governance: {
        requiredApprovals: [], maxCostPerExecution: 100, maxDurationMs: 60000, allowedClassifications: ['UNCLASSIFIED'], auditLevel: 'standard', incidentEscalation: [],
      },
      provenance: { createdBy: 'test', createdAt: new Date(), version: '1.0', slsaLevel: 'SLSA_0', attestations: [] },
      metadata: {},
    };

    const result = await orchestrator.executeChain({
      chain,
      inputs: {},
      context: createMockContext(),
    });

    expect(result.success).toBe(false);
    expect(provider.calls.length).toBe(1); // Should not retry
  });

  it('should exhaust retries and fail', async () => {
    const policyEngine = new AgentPolicyEngine({ failSafe: 'allow' });
    vi.spyOn(policyEngine, 'evaluateChain').mockResolvedValue({
      allow: true,
      reason: 'Allowed',
      policyPath: 'root',
      auditLevel: 'info',
    });

    const orchestrator = new PromptChainOrchestrator(policyEngine, {
        maxValidationRetries: 2
    });

    const provider = new MockProvider(10); // Fail always
    orchestrator.registerProvider(provider);

    const chain: PromptChain = {
      id: 'chain-exhaust',
      name: 'Test Chain Exhaust',
      description: 'Test',
      steps: [
        {
          id: 'step-1',
          sequence: 1,
          llmProvider: 'test-provider',
          prompt: { template: 'Generate JSON', variables: [], maxTokens: 100, temperature: 0, classification: 'UNCLASSIFIED' },
          inputMappings: {}, outputMappings: {},
          validations: [
            { type: 'schema', config: {}, action: 'remediate' }
          ],
          timeout: 1000,
          retryPolicy: { maxRetries: 0, backoffMs: 0, backoffMultiplier: 1, retryableErrors: [] },
        },
      ],
      governance: {
        requiredApprovals: [], maxCostPerExecution: 100, maxDurationMs: 60000, allowedClassifications: ['UNCLASSIFIED'], auditLevel: 'standard', incidentEscalation: [],
      },
      provenance: { createdBy: 'test', createdAt: new Date(), version: '1.0', slsaLevel: 'SLSA_0', attestations: [] },
      metadata: {},
    };

    const result = await orchestrator.executeChain({
      chain,
      inputs: {},
      context: createMockContext(),
    });

    expect(result.success).toBe(false);
    // Initial call + 2 retries = 3 calls total
    expect(provider.calls.length).toBe(3);
  });
});
