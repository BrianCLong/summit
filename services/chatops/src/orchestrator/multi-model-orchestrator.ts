/**
 * Multi-Model Orchestrator with Consensus Voting
 *
 * Implements parallel LLM execution with intelligent aggregation:
 * - Parallel inference across multiple models (Claude, GPT-4, Qwen, etc.)
 * - Confidence-weighted voting for consensus
 * - Automatic fallback and model rotation
 * - Cost-aware model selection
 * - Response quality scoring
 * - Latency-optimized routing
 *
 * Voting strategies:
 * - Majority vote (for classification tasks)
 * - Confidence-weighted average
 * - Best-of-N with quality scoring
 * - Ensemble with model specialization
 */

import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import type { ResilienceExecutor, ResiliencePolicy } from '../resilience/circuit-breaker.js';
import type { ObservabilityService } from '../observability/metrics.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ModelConfig {
  id: string;
  provider: 'anthropic' | 'openai' | 'azure' | 'bedrock' | 'ollama' | 'together';
  model: string;
  endpoint?: string;
  apiKey?: string;
  maxTokens: number;
  temperature?: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  avgLatencyMs: number;
  capabilities: ModelCapability[];
  weight?: number;
  enabled: boolean;
}

export type ModelCapability =
  | 'reasoning'
  | 'coding'
  | 'extraction'
  | 'classification'
  | 'summarization'
  | 'translation'
  | 'math'
  | 'tool_use'
  | 'vision'
  | 'long_context';

export interface OrchestratorConfig {
  models: ModelConfig[];
  defaultStrategy: VotingStrategy;
  maxParallelModels: number;
  timeoutMs: number;
  minModelsForConsensus: number;
  confidenceThreshold: number;
  costBudgetPerRequest?: number;
  resilience?: ResilienceExecutor;
  observability?: ObservabilityService;
}

export type VotingStrategy =
  | 'majority'
  | 'confidence_weighted'
  | 'best_of_n'
  | 'ensemble'
  | 'fastest_wins'
  | 'cheapest_wins';

export interface InferenceRequest {
  id?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  task?: ModelCapability;
  strategy?: VotingStrategy;
  models?: string[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  costBudget?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelResponse {
  modelId: string;
  provider: string;
  content: string;
  confidence: number;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  cost: number;
  metadata?: Record<string, unknown>;
}

export interface OrchestratedResponse {
  requestId: string;
  consensusContent: string;
  confidence: number;
  strategy: VotingStrategy;
  responses: ModelResponse[];
  selectedModelId: string;
  aggregationDetails: AggregationDetails;
  totalCost: number;
  totalLatencyMs: number;
  metadata: Record<string, unknown>;
}

export interface AggregationDetails {
  votingResults?: Record<string, number>;
  confidenceScores?: Record<string, number>;
  qualityScores?: Record<string, number>;
  agreementRate?: number;
  outlierModels?: string[];
}

// =============================================================================
// MODEL CLIENTS
// =============================================================================

interface ModelClient {
  inference(
    messages: Array<{ role: string; content: string }>,
    options: { maxTokens: number; temperature?: number }
  ): Promise<{
    content: string;
    tokensInput: number;
    tokensOutput: number;
  }>;
}

class AnthropicClient implements ModelClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async inference(
    messages: Array<{ role: string; content: string }>,
    options: { maxTokens: number; temperature?: number }
  ) {
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: systemMessage?.content,
      messages: chatMessages,
    });

    const textBlock = response.content.find(b => b.type === 'text');

    return {
      content: textBlock?.text || '',
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
    };
  }
}

class OpenAICompatibleClient implements ModelClient {
  private endpoint: string;
  private apiKey: string;
  private model: string;

  constructor(endpoint: string, apiKey: string, model: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.model = model;
  }

  async inference(
    messages: Array<{ role: string; content: string }>,
    options: { maxTokens: number; temperature?: number }
  ) {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      }),
    });

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      tokensInput: data.usage?.prompt_tokens || 0,
      tokensOutput: data.usage?.completion_tokens || 0,
    };
  }
}

// =============================================================================
// MULTI-MODEL ORCHESTRATOR
// =============================================================================

export class MultiModelOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private clients: Map<string, ModelClient> = new Map();
  private modelStats: Map<string, ModelStats> = new Map();

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.initializeClients();
  }

  private initializeClients(): void {
    for (const model of this.config.models) {
      if (!model.enabled) continue;

      let client: ModelClient;

      switch (model.provider) {
        case 'anthropic':
          client = new AnthropicClient(
            model.apiKey || process.env.ANTHROPIC_API_KEY || '',
            model.model
          );
          break;

        case 'openai':
          client = new OpenAICompatibleClient(
            model.endpoint || 'https://api.openai.com/v1',
            model.apiKey || process.env.OPENAI_API_KEY || '',
            model.model
          );
          break;

        case 'azure':
          client = new OpenAICompatibleClient(
            model.endpoint || '',
            model.apiKey || process.env.AZURE_OPENAI_API_KEY || '',
            model.model
          );
          break;

        case 'together':
          client = new OpenAICompatibleClient(
            model.endpoint || 'https://api.together.xyz/v1',
            model.apiKey || process.env.TOGETHER_API_KEY || '',
            model.model
          );
          break;

        case 'ollama':
          client = new OpenAICompatibleClient(
            model.endpoint || 'http://localhost:11434/v1',
            'ollama',
            model.model
          );
          break;

        default:
          console.warn(`Unknown provider: ${model.provider}`);
          continue;
      }

      this.clients.set(model.id, client);
      this.modelStats.set(model.id, {
        requests: 0,
        successes: 0,
        failures: 0,
        totalLatency: 0,
        totalCost: 0,
      });
    }
  }

  // ===========================================================================
  // MAIN INFERENCE
  // ===========================================================================

  async inference(request: InferenceRequest): Promise<OrchestratedResponse> {
    const requestId = request.id || uuidv4();
    const startTime = Date.now();

    // Select models based on task and constraints
    const selectedModels = this.selectModels(request);

    if (selectedModels.length === 0) {
      throw new Error('No suitable models available for this request');
    }

    // Execute parallel inference
    const responses = await this.executeParallel(selectedModels, request);

    if (responses.length === 0) {
      throw new Error('All model inferences failed');
    }

    // Aggregate responses based on strategy
    const strategy = request.strategy || this.config.defaultStrategy;
    const aggregated = this.aggregateResponses(responses, strategy);

    const totalLatency = Date.now() - startTime;

    // Record metrics
    this.recordMetrics(requestId, responses, aggregated, totalLatency);

    return {
      requestId,
      ...aggregated,
      strategy,
      responses,
      totalCost: responses.reduce((sum, r) => sum + r.cost, 0),
      totalLatencyMs: totalLatency,
      metadata: {
        modelsUsed: responses.map(r => r.modelId),
        taskType: request.task,
      },
    };
  }

  // ===========================================================================
  // MODEL SELECTION
  // ===========================================================================

  private selectModels(request: InferenceRequest): ModelConfig[] {
    let candidates = this.config.models.filter(m => m.enabled);

    // Filter by specific models if requested
    if (request.models?.length) {
      candidates = candidates.filter(m => request.models!.includes(m.id));
    }

    // Filter by capability if task specified
    if (request.task) {
      candidates = candidates.filter(m => m.capabilities.includes(request.task!));
    }

    // Filter by cost budget
    if (request.costBudget) {
      const estimatedCost = (tokens: number, config: ModelConfig) =>
        (tokens / 1000) * config.costPer1kInput +
        (request.maxTokens || 1000) / 1000 * config.costPer1kOutput;

      const inputTokens = this.estimateInputTokens(request.messages);
      candidates = candidates.filter(
        m => estimatedCost(inputTokens, m) <= request.costBudget!
      );
    }

    // Sort by weight/priority
    candidates.sort((a, b) => (b.weight || 1) - (a.weight || 1));

    // Limit to max parallel
    return candidates.slice(0, this.config.maxParallelModels);
  }

  private estimateInputTokens(
    messages: Array<{ role: string; content: string }>
  ): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(
      messages.reduce((sum, m) => sum + m.content.length, 0) / 4
    );
  }

  // ===========================================================================
  // PARALLEL EXECUTION
  // ===========================================================================

  private async executeParallel(
    models: ModelConfig[],
    request: InferenceRequest
  ): Promise<ModelResponse[]> {
    const promises = models.map(model =>
      this.executeWithResilience(model, request)
    );

    // Race with timeout
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), this.config.timeoutMs)
    );

    const results = await Promise.allSettled(
      promises.map(p => Promise.race([p, timeoutPromise]))
    );

    const responses: ModelResponse[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        responses.push(result.value as ModelResponse);
      }
    }

    return responses;
  }

  private async executeWithResilience(
    model: ModelConfig,
    request: InferenceRequest
  ): Promise<ModelResponse> {
    const client = this.clients.get(model.id);
    if (!client) {
      throw new Error(`No client for model: ${model.id}`);
    }

    const startTime = Date.now();
    const stats = this.modelStats.get(model.id)!;
    stats.requests++;

    try {
      const result = await client.inference(
        request.messages.map(m => ({ role: m.role, content: m.content })),
        {
          maxTokens: request.maxTokens || model.maxTokens,
          temperature: request.temperature ?? model.temperature,
        }
      );

      const latency = Date.now() - startTime;
      const cost =
        (result.tokensInput / 1000) * model.costPer1kInput +
        (result.tokensOutput / 1000) * model.costPer1kOutput;

      stats.successes++;
      stats.totalLatency += latency;
      stats.totalCost += cost;

      // Calculate confidence based on model performance history
      const confidence = this.calculateConfidence(model, result.content, stats);

      return {
        modelId: model.id,
        provider: model.provider,
        content: result.content,
        confidence,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        latencyMs: latency,
        cost,
      };
    } catch (error) {
      stats.failures++;
      throw error;
    }
  }

  private calculateConfidence(
    model: ModelConfig,
    content: string,
    stats: ModelStats
  ): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on success rate
    if (stats.requests > 10) {
      const successRate = stats.successes / stats.requests;
      confidence *= successRate;
    }

    // Adjust based on content quality signals
    if (content.length < 10) {
      confidence *= 0.5; // Very short responses are suspicious
    }

    if (content.includes('I cannot') || content.includes('I\'m unable')) {
      confidence *= 0.3; // Refusal responses
    }

    // Boost for known high-quality models
    if (model.provider === 'anthropic' && model.model.includes('opus')) {
      confidence *= 1.2;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  // ===========================================================================
  // RESPONSE AGGREGATION
  // ===========================================================================

  private aggregateResponses(
    responses: ModelResponse[],
    strategy: VotingStrategy
  ): {
    consensusContent: string;
    confidence: number;
    selectedModelId: string;
    aggregationDetails: AggregationDetails;
  } {
    switch (strategy) {
      case 'majority':
        return this.majorityVote(responses);
      case 'confidence_weighted':
        return this.confidenceWeightedVote(responses);
      case 'best_of_n':
        return this.bestOfN(responses);
      case 'fastest_wins':
        return this.fastestWins(responses);
      case 'cheapest_wins':
        return this.cheapestWins(responses);
      case 'ensemble':
      default:
        return this.ensembleVote(responses);
    }
  }

  private majorityVote(responses: ModelResponse[]): {
    consensusContent: string;
    confidence: number;
    selectedModelId: string;
    aggregationDetails: AggregationDetails;
  } {
    // Group similar responses
    const groups = this.groupSimilarResponses(responses);
    const sortedGroups = Array.from(groups.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );

    const [winningContent, winningGroup] = sortedGroups[0];
    const agreementRate = winningGroup.length / responses.length;

    const votingResults: Record<string, number> = {};
    for (const [content, group] of groups) {
      votingResults[content.slice(0, 50)] = group.length;
    }

    return {
      consensusContent: winningContent,
      confidence: agreementRate,
      selectedModelId: winningGroup[0].modelId,
      aggregationDetails: {
        votingResults,
        agreementRate,
      },
    };
  }

  private confidenceWeightedVote(responses: ModelResponse[]): {
    consensusContent: string;
    confidence: number;
    selectedModelId: string;
    aggregationDetails: AggregationDetails;
  } {
    // Weight by confidence scores
    const totalConfidence = responses.reduce((sum, r) => sum + r.confidence, 0);

    const confidenceScores: Record<string, number> = {};
    for (const response of responses) {
      confidenceScores[response.modelId] = response.confidence;
    }

    // Select highest confidence
    const best = responses.reduce((a, b) =>
      a.confidence > b.confidence ? a : b
    );

    return {
      consensusContent: best.content,
      confidence: best.confidence,
      selectedModelId: best.modelId,
      aggregationDetails: {
        confidenceScores,
      },
    };
  }

  private bestOfN(responses: ModelResponse[]): {
    consensusContent: string;
    confidence: number;
    selectedModelId: string;
    aggregationDetails: AggregationDetails;
  } {
    // Score each response on quality metrics
    const qualityScores: Record<string, number> = {};

    for (const response of responses) {
      const score = this.scoreResponseQuality(response);
      qualityScores[response.modelId] = score;
    }

    // Select best quality
    const best = responses.reduce((a, b) =>
      qualityScores[a.modelId] > qualityScores[b.modelId] ? a : b
    );

    return {
      consensusContent: best.content,
      confidence: qualityScores[best.modelId],
      selectedModelId: best.modelId,
      aggregationDetails: {
        qualityScores,
      },
    };
  }

  private fastestWins(responses: ModelResponse[]): {
    consensusContent: string;
    confidence: number;
    selectedModelId: string;
    aggregationDetails: AggregationDetails;
  } {
    const fastest = responses.reduce((a, b) =>
      a.latencyMs < b.latencyMs ? a : b
    );

    return {
      consensusContent: fastest.content,
      confidence: fastest.confidence,
      selectedModelId: fastest.modelId,
      aggregationDetails: {},
    };
  }

  private cheapestWins(responses: ModelResponse[]): {
    consensusContent: string;
    confidence: number;
    selectedModelId: string;
    aggregationDetails: AggregationDetails;
  } {
    const cheapest = responses.reduce((a, b) =>
      a.cost < b.cost ? a : b
    );

    return {
      consensusContent: cheapest.content,
      confidence: cheapest.confidence,
      selectedModelId: cheapest.modelId,
      aggregationDetails: {},
    };
  }

  private ensembleVote(responses: ModelResponse[]): {
    consensusContent: string;
    confidence: number;
    selectedModelId: string;
    aggregationDetails: AggregationDetails;
  } {
    // Combine multiple strategies
    const groups = this.groupSimilarResponses(responses);
    const agreementRate = Math.max(...Array.from(groups.values()).map(g => g.length)) / responses.length;

    // Weight by multiple factors
    const scores: Map<string, number> = new Map();

    for (const response of responses) {
      let score = 0;

      // Confidence weight
      score += response.confidence * 0.4;

      // Agreement weight (if in majority group)
      const responseGroup = Array.from(groups.entries())
        .find(([_, group]) => group.includes(response));
      if (responseGroup) {
        score += (responseGroup[1].length / responses.length) * 0.3;
      }

      // Quality weight
      score += this.scoreResponseQuality(response) * 0.3;

      scores.set(response.modelId, score);
    }

    const bestModelId = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    const best = responses.find(r => r.modelId === bestModelId)!;

    return {
      consensusContent: best.content,
      confidence: scores.get(bestModelId)!,
      selectedModelId: bestModelId,
      aggregationDetails: {
        agreementRate,
        confidenceScores: Object.fromEntries(
          responses.map(r => [r.modelId, r.confidence])
        ),
        qualityScores: Object.fromEntries(
          responses.map(r => [r.modelId, this.scoreResponseQuality(r)])
        ),
      },
    };
  }

  private groupSimilarResponses(
    responses: ModelResponse[]
  ): Map<string, ModelResponse[]> {
    const groups = new Map<string, ModelResponse[]>();

    for (const response of responses) {
      // Normalize content for comparison
      const normalized = this.normalizeContent(response.content);

      let foundGroup = false;
      for (const [key, group] of groups) {
        if (this.contentSimilarity(normalized, key) > 0.8) {
          group.push(response);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        groups.set(normalized, [response]);
      }
    }

    return groups;
  }

  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private contentSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity on word sets
    const wordsA = new Set(a.split(' '));
    const wordsB = new Set(b.split(' '));

    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }

  private scoreResponseQuality(response: ModelResponse): number {
    let score = 0.5;

    // Length heuristic
    const length = response.content.length;
    if (length > 50 && length < 5000) {
      score += 0.2;
    }

    // Structure heuristic (has formatting)
    if (response.content.includes('\n') || response.content.includes('- ')) {
      score += 0.1;
    }

    // Confidence contribution
    score += response.confidence * 0.2;

    return Math.min(1, score);
  }

  // ===========================================================================
  // METRICS & STATS
  // ===========================================================================

  private recordMetrics(
    requestId: string,
    responses: ModelResponse[],
    aggregated: { selectedModelId: string; confidence: number },
    latency: number
  ): void {
    this.emit('inference', {
      requestId,
      modelsUsed: responses.map(r => r.modelId),
      selectedModel: aggregated.selectedModelId,
      confidence: aggregated.confidence,
      latencyMs: latency,
      totalCost: responses.reduce((sum, r) => sum + r.cost, 0),
    });

    if (this.config.observability) {
      for (const response of responses) {
        this.config.observability.recordTokens({
          model: response.modelId,
          inputTokens: response.tokensInput,
          outputTokens: response.tokensOutput,
          operation: 'inference',
        });
      }
    }
  }

  getModelStats(): Map<string, ModelStats> {
    return new Map(this.modelStats);
  }

  resetStats(): void {
    for (const [id] of this.modelStats) {
      this.modelStats.set(id, {
        requests: 0,
        successes: 0,
        failures: 0,
        totalLatency: 0,
        totalCost: 0,
      });
    }
  }
}

interface ModelStats {
  requests: number;
  successes: number;
  failures: number;
  totalLatency: number;
  totalCost: number;
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export const ModelPresets = {
  claude: (tier: 'opus' | 'sonnet' | 'haiku'): ModelConfig => {
    const models = {
      opus: {
        model: 'claude-opus-4-20250514',
        costPer1kInput: 0.015,
        costPer1kOutput: 0.075,
        avgLatencyMs: 3000,
      },
      sonnet: {
        model: 'claude-sonnet-4-20250514',
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
        avgLatencyMs: 1500,
      },
      haiku: {
        model: 'claude-3-5-haiku-20241022',
        costPer1kInput: 0.001,
        costPer1kOutput: 0.005,
        avgLatencyMs: 500,
      },
    };

    return {
      id: `claude-${tier}`,
      provider: 'anthropic',
      model: models[tier].model,
      maxTokens: 4096,
      temperature: 0.7,
      costPer1kInput: models[tier].costPer1kInput,
      costPer1kOutput: models[tier].costPer1kOutput,
      avgLatencyMs: models[tier].avgLatencyMs,
      capabilities: ['reasoning', 'coding', 'extraction', 'classification', 'summarization', 'tool_use'],
      weight: tier === 'opus' ? 1.2 : tier === 'sonnet' ? 1.0 : 0.8,
      enabled: true,
    };
  },

  gpt4: (): ModelConfig => ({
    id: 'gpt-4-turbo',
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    avgLatencyMs: 2000,
    capabilities: ['reasoning', 'coding', 'extraction', 'classification', 'tool_use'],
    weight: 1.0,
    enabled: true,
  }),

  qwen: (): ModelConfig => ({
    id: 'qwen-72b',
    provider: 'together',
    model: 'Qwen/Qwen2-72B-Instruct',
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInput: 0.0009,
    costPer1kOutput: 0.0009,
    avgLatencyMs: 1000,
    capabilities: ['reasoning', 'coding', 'extraction', 'classification'],
    weight: 0.9,
    enabled: true,
  }),

  mixtral: (): ModelConfig => ({
    id: 'mixtral-8x7b',
    provider: 'together',
    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInput: 0.0006,
    costPer1kOutput: 0.0006,
    avgLatencyMs: 800,
    capabilities: ['reasoning', 'coding', 'extraction'],
    weight: 0.8,
    enabled: true,
  }),
};

// =============================================================================
// FACTORY
// =============================================================================

export function createOrchestrator(config: OrchestratorConfig): MultiModelOrchestrator {
  return new MultiModelOrchestrator(config);
}

export function createDefaultOrchestrator(): MultiModelOrchestrator {
  return new MultiModelOrchestrator({
    models: [
      ModelPresets.claude('sonnet'),
      ModelPresets.claude('haiku'),
      ModelPresets.gpt4(),
      ModelPresets.qwen(),
    ],
    defaultStrategy: 'ensemble',
    maxParallelModels: 3,
    timeoutMs: 30000,
    minModelsForConsensus: 2,
    confidenceThreshold: 0.7,
  });
}
