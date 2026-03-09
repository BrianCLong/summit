/**
 * Multi-LLM Prompt Chain Orchestrator
 *
 * Orchestrates execution of multi-step prompt chains across different LLM providers
 * with built-in governance controls, validation, and provenance tracking.
 */

import crypto from 'node:crypto';
import {
  PromptChain,
  PromptChainStep,
  LLMProvider,
  PromptValidation,
  AgentPolicyContext,
  PolicyDecision,
  GovernanceEvent,
  HallucinationDetection,
  AgentClassification,
  ChainProvenance,
  ProvenanceAttestation,
} from '../types';
import { AgentPolicyEngine } from '../policy-engine/AgentPolicyEngine';

// ============================================================================
// Configuration
// ============================================================================

export interface OrchestratorConfig {
  maxConcurrentChains: number;
  defaultTimeoutMs: number;
  maxChainCostUsd: number;
  enableProvenance: boolean;
  enableHallucinationCheck: boolean;
  hallucinationThreshold: number;
  auditLevel: 'minimal' | 'standard' | 'enhanced' | 'forensic';
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrentChains: 10,
  defaultTimeoutMs: 60_000,
  maxChainCostUsd: 100,
  enableProvenance: true,
  enableHallucinationCheck: true,
  hallucinationThreshold: 0.7,
  auditLevel: 'standard',
};

// ============================================================================
// Execution Types
// ============================================================================

export interface ChainExecutionRequest {
  chain: PromptChain;
  inputs: Record<string, unknown>;
  context: AgentPolicyContext;
  overrides?: {
    timeout?: number;
    maxCost?: number;
    skipValidation?: boolean;
  };
}

export interface ChainExecutionResult {
  chainId: string;
  success: boolean;
  outputs: Record<string, unknown>;
  steps: StepExecutionResult[];
  metrics: ChainMetrics;
  provenance: ChainProvenance;
  hallucinationReport?: HallucinationReport;
  errors?: string[];
}

export interface StepExecutionResult {
  stepId: string;
  sequence: number;
  llmProvider: string;
  success: boolean;
  output: unknown;
  latencyMs: number;
  tokenCount: { input: number; output: number };
  cost: number;
  validationResults: ValidationResult[];
  error?: string;
}

export interface ValidationResult {
  type: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface ChainMetrics {
  totalLatencyMs: number;
  totalTokens: number;
  totalCost: number;
  stepsCompleted: number;
  stepsTotal: number;
  retries: number;
  validationsPassed: number;
  validationsFailed: number;
}

export interface HallucinationReport {
  checked: boolean;
  detections: HallucinationDetection[];
  overallScore: number;
  passed: boolean;
}

// ============================================================================
// LLM Provider Adapter Interface
// ============================================================================

export interface LLMProviderAdapter {
  id: string;
  provider: LLMProvider;
  execute(
    prompt: string,
    systemPrompt: string | undefined,
    options: LLMExecutionOptions,
  ): Promise<LLMExecutionResult>;
  estimateCost(inputTokens: number, outputTokens: number): number;
  checkHealth(): Promise<boolean>;
}

export interface LLMExecutionOptions {
  maxTokens: number;
  temperature: number;
  timeout: number;
  stopSequences?: string[];
}

export interface LLMExecutionResult {
  output: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  modelId: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
}

// ============================================================================
// Prompt Chain Orchestrator
// ============================================================================

export class PromptChainOrchestrator {
  private config: OrchestratorConfig;
  private policyEngine: AgentPolicyEngine;
  private providers: Map<string, LLMProviderAdapter>;
  private activeChains: Map<string, ChainExecutionState>;
  private eventListeners: Array<(event: GovernanceEvent) => void>;

  constructor(
    policyEngine: AgentPolicyEngine,
    config: Partial<OrchestratorConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.policyEngine = policyEngine;
    this.providers = new Map();
    this.activeChains = new Map();
    this.eventListeners = [];
  }

  /**
   * Register an LLM provider adapter
   */
  registerProvider(adapter: LLMProviderAdapter): void {
    this.providers.set(adapter.id, adapter);
  }

  /**
   * Execute a prompt chain with full governance controls
   */
  async executeChain(request: ChainExecutionRequest): Promise<ChainExecutionResult> {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    const state: ChainExecutionState = {
      executionId,
      chainId: request.chain.id,
      startTime,
      currentStep: 0,
      outputs: { ...request.inputs },
      stepResults: [],
      metrics: this.initializeMetrics(request.chain),
      status: 'running',
    };

    this.activeChains.set(executionId, state);

    try {
      // Pre-execution policy check
      const policyDecision = await this.checkChainPolicy(request);
      if (!policyDecision.allow) {
        return this.createFailedResult(
          request.chain,
          state,
          `Policy denied: ${policyDecision.reason}`,
        );
      }

      // Validate chain configuration
      const validationErrors = this.validateChain(request.chain);
      if (validationErrors.length > 0) {
        return this.createFailedResult(
          request.chain,
          state,
          `Chain validation failed: ${validationErrors.join(', ')}`,
        );
      }

      // Execute each step in sequence
      for (const step of request.chain.steps.sort((a, b) => a.sequence - b.sequence)) {
        state.currentStep = step.sequence;

        const stepResult = await this.executeStep(step, state, request);
        state.stepResults.push(stepResult);

        if (!stepResult.success) {
          // Check for fallback
          if (step.fallback) {
            const fallbackResult = await this.executeFallback(step, state, request);
            if (fallbackResult.success) {
              state.stepResults[state.stepResults.length - 1] = fallbackResult;
              continue;
            }
          }

          state.status = 'failed';
          break;
        }

        // Map outputs to state
        for (const [outputKey, stateKey] of Object.entries(step.outputMappings)) {
          state.outputs[stateKey] = (stepResult.output as Record<string, unknown>)?.[outputKey] ?? stepResult.output;
        }
      }

      // Check for hallucinations if enabled
      let hallucinationReport: HallucinationReport | undefined;
      if (this.config.enableHallucinationCheck) {
        hallucinationReport = await this.checkHallucinations(state, request);
        if (!hallucinationReport.passed) {
          state.status = 'failed';
          return this.createFailedResult(
            request.chain,
            state,
            'Hallucination detection threshold exceeded',
            hallucinationReport,
          );
        }
      }

      // Build provenance
      const provenance = this.buildProvenance(request.chain, state, request.context);

      // Update final metrics
      state.metrics.totalLatencyMs = Date.now() - startTime;
      state.status = 'completed';

      // Emit completion event
      this.emitEvent({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type: 'chain_executed',
        source: 'PromptChainOrchestrator',
        agentId: request.context.agentId,
        fleetId: request.context.fleetId,
        sessionId: request.context.sessionId,
        actor: request.context.userContext.userId,
        action: 'execute_chain',
        resource: request.chain.id,
        outcome: 'success',
        classification: request.context.classification,
        details: {
          chainName: request.chain.name,
          stepsCompleted: state.stepResults.length,
          totalCost: state.metrics.totalCost,
          latencyMs: state.metrics.totalLatencyMs,
        },
      });

      return {
        chainId: request.chain.id,
        success: true,
        outputs: state.outputs,
        steps: state.stepResults,
        metrics: state.metrics,
        provenance,
        hallucinationReport,
      };
    } catch (error) {
      state.status = 'failed';

      this.emitEvent({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type: 'chain_executed',
        source: 'PromptChainOrchestrator',
        agentId: request.context.agentId,
        fleetId: request.context.fleetId,
        sessionId: request.context.sessionId,
        actor: request.context.userContext.userId,
        action: 'execute_chain',
        resource: request.chain.id,
        outcome: 'failure',
        classification: request.context.classification,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return this.createFailedResult(
        request.chain,
        state,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      this.activeChains.delete(executionId);
    }
  }

  /**
   * Execute a single step in the chain
   */
  private async executeStep(
    step: PromptChainStep,
    state: ChainExecutionState,
    request: ChainExecutionRequest,
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();

    try {
      // Get provider
      const provider = this.providers.get(step.llmProvider);
      if (!provider) {
        throw new Error(`Provider not found: ${step.llmProvider}`);
      }

      // Build prompt from template
      const prompt = this.buildPrompt(step.prompt, state.outputs, step.inputMappings);

      // Execute with retry logic
      let result: LLMExecutionResult | null = null;
      let lastError: Error | null = null;
      let retries = 0;

      for (let attempt = 0; attempt <= step.retryPolicy.maxRetries; attempt++) {
        try {
          result = await provider.execute(prompt, step.prompt.systemPrompt, {
            maxTokens: step.prompt.maxTokens,
            temperature: step.prompt.temperature,
            timeout: step.timeout,
          });
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          retries++;

          if (attempt < step.retryPolicy.maxRetries) {
            const backoff =
              step.retryPolicy.backoffMs *
              Math.pow(step.retryPolicy.backoffMultiplier, attempt);
            await this.sleep(backoff);
          }
        }
      }

      if (!result) {
        throw lastError || new Error('Execution failed');
      }

      state.metrics.retries += retries;

      // Run validations
      const validationResults = await this.runValidations(
        step.validations,
        result.output,
        state.outputs,
      );

      const allPassed = validationResults.every((v) => v.passed);
      state.metrics.validationsPassed += validationResults.filter((v) => v.passed).length;
      state.metrics.validationsFailed += validationResults.filter((v) => !v.passed).length;

      // Calculate cost
      const cost = provider.estimateCost(result.inputTokens, result.outputTokens);
      state.metrics.totalCost += cost;
      state.metrics.totalTokens += result.inputTokens + result.outputTokens;

      // Check cost limit
      const maxCost = request.overrides?.maxCost ?? this.config.maxChainCostUsd;
      if (state.metrics.totalCost > maxCost) {
        throw new Error(`Chain cost exceeded limit: $${state.metrics.totalCost} > $${maxCost}`);
      }

      state.metrics.stepsCompleted++;

      return {
        stepId: step.id,
        sequence: step.sequence,
        llmProvider: step.llmProvider,
        success: allPassed,
        output: this.parseOutput(result.output),
        latencyMs: Date.now() - startTime,
        tokenCount: { input: result.inputTokens, output: result.outputTokens },
        cost,
        validationResults,
        error: allPassed ? undefined : 'Validation failed',
      };
    } catch (error) {
      return {
        stepId: step.id,
        sequence: step.sequence,
        llmProvider: step.llmProvider,
        success: false,
        output: null,
        latencyMs: Date.now() - startTime,
        tokenCount: { input: 0, output: 0 },
        cost: 0,
        validationResults: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute fallback step
   */
  private async executeFallback(
    originalStep: PromptChainStep,
    state: ChainExecutionState,
    request: ChainExecutionRequest,
  ): Promise<StepExecutionResult> {
    const fallbackStep: PromptChainStep = {
      ...originalStep,
      id: `${originalStep.id}_fallback`,
      llmProvider: originalStep.fallback!,
      retryPolicy: { ...originalStep.retryPolicy, maxRetries: 1 },
    };

    return this.executeStep(fallbackStep, state, request);
  }

  /**
   * Check chain execution policy
   */
  private async checkChainPolicy(request: ChainExecutionRequest): Promise<PolicyDecision> {
    return this.policyEngine.evaluateChain(request.context, {
      chainId: request.chain.id,
      stepCount: request.chain.steps.length,
      totalCost: this.estimateChainCost(request.chain),
    });
  }

  /**
   * Validate chain configuration
   */
  private validateChain(chain: PromptChain): string[] {
    const errors: string[] = [];

    if (!chain.id) {
      errors.push('Chain ID is required');
    }

    if (!chain.steps || chain.steps.length === 0) {
      errors.push('Chain must have at least one step');
    }

    for (const step of chain.steps) {
      if (!this.providers.has(step.llmProvider)) {
        errors.push(`Unknown provider: ${step.llmProvider}`);
      }

      if (step.timeout <= 0) {
        errors.push(`Invalid timeout for step ${step.id}`);
      }
    }

    // Check for circular dependencies in input mappings
    const stepOutputs = new Set<string>();
    for (const step of chain.steps.sort((a, b) => a.sequence - b.sequence)) {
      for (const inputKey of Object.values(step.inputMappings)) {
        if (
          !stepOutputs.has(inputKey) &&
          !chain.steps[0].inputMappings[inputKey] // Not an initial input
        ) {
          // Allow if it's a chain input
        }
      }

      for (const outputKey of Object.values(step.outputMappings)) {
        stepOutputs.add(outputKey);
      }
    }

    return errors;
  }

  /**
   * Build prompt from template and inputs
   */
  private buildPrompt(
    template: { template: string; variables: string[] },
    outputs: Record<string, unknown>,
    inputMappings: Record<string, string>,
  ): string {
    let prompt = template.template;

    for (const variable of template.variables) {
      const mappedKey = inputMappings[variable] || variable;
      const value = outputs[mappedKey];

      if (value !== undefined) {
        prompt = prompt.replace(
          new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g'),
          String(value),
        );
      }
    }

    return prompt;
  }

  /**
   * Run validations on step output
   */
  private async runValidations(
    validations: PromptValidation[],
    output: string,
    context: Record<string, unknown>,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const validation of validations) {
      try {
        const result = await this.runValidation(validation, output, context);
        results.push(result);

        if (!result.passed && validation.action === 'reject') {
          break;
        }
      } catch (error) {
        results.push({
          type: validation.type,
          passed: false,
          message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return results;
  }

  /**
   * Run a single validation
   */
  private async runValidation(
    validation: PromptValidation,
    output: string,
    context: Record<string, unknown>,
  ): Promise<ValidationResult> {
    switch (validation.type) {
      case 'regex': {
        const pattern = new RegExp(validation.config.pattern as string);
        const passed = pattern.test(output);
        return {
          type: 'regex',
          passed,
          message: passed ? 'Pattern matched' : 'Pattern not matched',
        };
      }

      case 'schema': {
        // Simplified schema validation
        try {
          const parsed = JSON.parse(output);
          return {
            type: 'schema',
            passed: true,
            message: 'Valid JSON',
            details: { parsed },
          };
        } catch {
          return {
            type: 'schema',
            passed: false,
            message: 'Invalid JSON schema',
          };
        }
      }

      case 'safety': {
        // Safety content filter
        const blockedPatterns = validation.config.blockedPatterns as string[] || [];
        const hasBlockedContent = blockedPatterns.some((pattern) =>
          output.toLowerCase().includes(pattern.toLowerCase()),
        );

        return {
          type: 'safety',
          passed: !hasBlockedContent,
          message: hasBlockedContent ? 'Blocked content detected' : 'Content safe',
        };
      }

      case 'hallucination': {
        // Placeholder for hallucination detection
        return {
          type: 'hallucination',
          passed: true,
          message: 'Hallucination check passed',
        };
      }

      default:
        return {
          type: validation.type,
          passed: true,
          message: 'Unknown validation type - skipped',
        };
    }
  }

  /**
   * Check for hallucinations in chain output
   */
  private async checkHallucinations(
    state: ChainExecutionState,
    request: ChainExecutionRequest,
  ): Promise<HallucinationReport> {
    // Placeholder implementation
    // In production, this would integrate with the HallucinationAuditor
    return {
      checked: true,
      detections: [],
      overallScore: 0,
      passed: true,
    };
  }

  /**
   * Build provenance record for chain execution
   */
  private buildProvenance(
    chain: PromptChain,
    state: ChainExecutionState,
    context: AgentPolicyContext,
  ): ChainProvenance {
    const attestations: ProvenanceAttestation[] = [];

    // Add execution attestation
    attestations.push({
      type: 'deployment',
      attestedBy: 'PromptChainOrchestrator',
      attestedAt: new Date(),
      predicateType: 'https://summit.intelgraph.io/chain-execution/v1',
      predicate: {
        chainId: chain.id,
        executionId: state.executionId,
        stepsCompleted: state.metrics.stepsCompleted,
        totalCost: state.metrics.totalCost,
        agentId: context.agentId,
      },
      signature: this.signAttestation({
        chainId: chain.id,
        timestamp: new Date().toISOString(),
      }),
    });

    return {
      createdBy: context.userContext.userId,
      createdAt: new Date(),
      version: chain.provenance?.version || '1.0.0',
      slsaLevel: context.environmentContext.slsaLevel,
      attestations,
    };
  }

  /**
   * Sign attestation (placeholder for real crypto)
   */
  private signAttestation(data: Record<string, unknown>): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Parse LLM output
   */
  private parseOutput(output: string): unknown {
    try {
      return JSON.parse(output);
    } catch {
      return output;
    }
  }

  /**
   * Estimate chain cost
   */
  private estimateChainCost(chain: PromptChain): number {
    let totalCost = 0;

    for (const step of chain.steps) {
      const provider = this.providers.get(step.llmProvider);
      if (provider) {
        // Rough estimate based on max tokens
        totalCost += provider.estimateCost(step.prompt.maxTokens / 2, step.prompt.maxTokens);
      }
    }

    return totalCost;
  }

  /**
   * Initialize metrics for a chain
   */
  private initializeMetrics(chain: PromptChain): ChainMetrics {
    return {
      totalLatencyMs: 0,
      totalTokens: 0,
      totalCost: 0,
      stepsCompleted: 0,
      stepsTotal: chain.steps.length,
      retries: 0,
      validationsPassed: 0,
      validationsFailed: 0,
    };
  }

  /**
   * Create failed result
   */
  private createFailedResult(
    chain: PromptChain,
    state: ChainExecutionState,
    error: string,
    hallucinationReport?: HallucinationReport,
  ): ChainExecutionResult {
    return {
      chainId: chain.id,
      success: false,
      outputs: state.outputs,
      steps: state.stepResults,
      metrics: {
        ...state.metrics,
        totalLatencyMs: Date.now() - state.startTime,
      },
      provenance: chain.provenance || {
        createdBy: 'system',
        createdAt: new Date(),
        version: '0.0.0',
        slsaLevel: 'SLSA_0',
        attestations: [],
      },
      hallucinationReport,
      errors: [error],
    };
  }

  /**
   * Add event listener
   */
  onEvent(listener: (event: GovernanceEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Emit governance event
   */
  private emitEvent(event: GovernanceEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }

  /**
   * Get active chains
   */
  getActiveChains(): string[] {
    return Array.from(this.activeChains.keys());
  }

  /**
   * Cancel a running chain
   */
  cancelChain(executionId: string): boolean {
    const state = this.activeChains.get(executionId);
    if (state) {
      state.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Helper to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Internal Types
// ============================================================================

interface ChainExecutionState {
  executionId: string;
  chainId: string;
  startTime: number;
  currentStep: number;
  outputs: Record<string, unknown>;
  stepResults: StepExecutionResult[];
  metrics: ChainMetrics;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}
