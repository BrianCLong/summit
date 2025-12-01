/**
 * AI Attribution Tracking
 *
 * Tracks AI/ML model contributions to entity creation and analysis.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface AIAttribution {
  /** Attribution ID */
  id: string;
  /** Model identifier */
  modelId: string;
  /** Model version */
  modelVersion: string;
  /** Model provider (openai, anthropic, local, etc.) */
  provider: string;
  /** Operation type */
  operationType: 'extraction' | 'inference' | 'classification' | 'generation' | 'summarization' | 'embedding';
  /** Input summary (truncated for storage) */
  input: {
    type: 'text' | 'image' | 'audio' | 'structured';
    hash: string;
    tokenCount?: number;
    preview?: string;
  };
  /** Output summary */
  output: {
    type: 'entity' | 'relationship' | 'text' | 'embedding' | 'classification';
    hash: string;
    tokenCount?: number;
    entityIds?: string[];
  };
  /** Model configuration */
  config: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    systemPrompt?: string;
  };
  /** Performance metrics */
  metrics: {
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost?: number;
  };
  /** Confidence score */
  confidence: number;
  /** Timestamp */
  timestamp: Date;
  /** User who triggered the operation */
  userId: string;
  /** Tenant ID */
  tenantId: string;
  /** Investigation ID */
  investigationId?: string;
  /** Correlation ID for tracing */
  correlationId?: string;
}

export interface ModelCard {
  /** Model ID */
  modelId: string;
  /** Display name */
  name: string;
  /** Provider */
  provider: string;
  /** Version */
  version: string;
  /** Description */
  description: string;
  /** Capabilities */
  capabilities: string[];
  /** Known limitations */
  limitations: string[];
  /** Training data summary */
  trainingData?: {
    sources: string[];
    cutoffDate?: string;
    size?: string;
  };
  /** Evaluation metrics */
  evaluation?: {
    benchmarks: Array<{
      name: string;
      score: number;
      date: string;
    }>;
  };
  /** Usage guidelines */
  guidelines: {
    recommendedUses: string[];
    notRecommended: string[];
    biasConsiderations: string[];
  };
  /** License */
  license: string;
  /** Last updated */
  lastUpdated: Date;
}

// -----------------------------------------------------------------------------
// Attribution Tracker
// -----------------------------------------------------------------------------

export class AIAttributionTracker {
  private attributions: AIAttribution[] = [];
  private modelCards: Map<string, ModelCard> = new Map();

  /**
   * Record an AI attribution
   */
  async record(attribution: Omit<AIAttribution, 'id' | 'timestamp'>): Promise<string> {
    const id = this.generateId();
    const record: AIAttribution = {
      ...attribution,
      id,
      timestamp: new Date(),
    };
    this.attributions.push(record);
    return id;
  }

  /**
   * Get attributions for an entity
   */
  getForEntity(entityId: string): AIAttribution[] {
    return this.attributions.filter(
      (a) => a.output.entityIds?.includes(entityId)
    );
  }

  /**
   * Get attributions for an investigation
   */
  getForInvestigation(investigationId: string): AIAttribution[] {
    return this.attributions.filter(
      (a) => a.investigationId === investigationId
    );
  }

  /**
   * Get attributions by model
   */
  getByModel(modelId: string): AIAttribution[] {
    return this.attributions.filter((a) => a.modelId === modelId);
  }

  /**
   * Get total costs for a tenant
   */
  getTenantCosts(tenantId: string, startDate: Date, endDate: Date): {
    totalCost: number;
    totalTokens: number;
    byModel: Record<string, { cost: number; tokens: number }>;
  } {
    const filtered = this.attributions.filter(
      (a) =>
        a.tenantId === tenantId &&
        a.timestamp >= startDate &&
        a.timestamp <= endDate
    );

    const byModel: Record<string, { cost: number; tokens: number }> = {};
    let totalCost = 0;
    let totalTokens = 0;

    for (const attr of filtered) {
      const cost = attr.metrics.estimatedCost || 0;
      const tokens = attr.metrics.totalTokens;

      totalCost += cost;
      totalTokens += tokens;

      if (!byModel[attr.modelId]) {
        byModel[attr.modelId] = { cost: 0, tokens: 0 };
      }
      byModel[attr.modelId].cost += cost;
      byModel[attr.modelId].tokens += tokens;
    }

    return { totalCost, totalTokens, byModel };
  }

  /**
   * Register a model card
   */
  registerModelCard(card: ModelCard): void {
    this.modelCards.set(card.modelId, card);
  }

  /**
   * Get model card
   */
  getModelCard(modelId: string): ModelCard | undefined {
    return this.modelCards.get(modelId);
  }

  /**
   * Generate attribution report
   */
  generateReport(options: {
    startDate: Date;
    endDate: Date;
    tenantId?: string;
    investigationId?: string;
  }): AttributionReport {
    const filtered = this.attributions.filter((a) => {
      if (a.timestamp < options.startDate || a.timestamp > options.endDate) return false;
      if (options.tenantId && a.tenantId !== options.tenantId) return false;
      if (options.investigationId && a.investigationId !== options.investigationId) return false;
      return true;
    });

    const operationCounts: Record<string, number> = {};
    const modelUsage: Record<string, number> = {};
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;

    for (const attr of filtered) {
      operationCounts[attr.operationType] = (operationCounts[attr.operationType] || 0) + 1;
      modelUsage[attr.modelId] = (modelUsage[attr.modelId] || 0) + 1;
      totalTokens += attr.metrics.totalTokens;
      totalCost += attr.metrics.estimatedCost || 0;
      totalLatency += attr.metrics.latencyMs;
    }

    return {
      period: { start: options.startDate, end: options.endDate },
      summary: {
        totalOperations: filtered.length,
        totalTokens,
        totalCost,
        averageLatencyMs: filtered.length > 0 ? totalLatency / filtered.length : 0,
        averageConfidence: filtered.length > 0
          ? filtered.reduce((sum, a) => sum + a.confidence, 0) / filtered.length
          : 0,
      },
      operationCounts,
      modelUsage,
      attributions: filtered,
    };
  }

  private generateId(): string {
    return `ai_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface AttributionReport {
  period: { start: Date; end: Date };
  summary: {
    totalOperations: number;
    totalTokens: number;
    totalCost: number;
    averageLatencyMs: number;
    averageConfidence: number;
  };
  operationCounts: Record<string, number>;
  modelUsage: Record<string, number>;
  attributions: AIAttribution[];
}

// -----------------------------------------------------------------------------
// Attribution Middleware
// -----------------------------------------------------------------------------

/**
 * Create middleware for tracking AI operations
 */
export function createAIAttributionMiddleware(tracker: AIAttributionTracker) {
  return async function attributionMiddleware(
    operation: {
      modelId: string;
      modelVersion: string;
      provider: string;
      operationType: AIAttribution['operationType'];
      input: AIAttribution['input'];
      config: AIAttribution['config'];
      userId: string;
      tenantId: string;
      investigationId?: string;
      correlationId?: string;
    },
    execute: () => Promise<{
      output: AIAttribution['output'];
      confidence: number;
    }>
  ): Promise<{ attributionId: string; result: any }> {
    const startTime = Date.now();

    const result = await execute();

    const latencyMs = Date.now() - startTime;

    const attributionId = await tracker.record({
      modelId: operation.modelId,
      modelVersion: operation.modelVersion,
      provider: operation.provider,
      operationType: operation.operationType,
      input: operation.input,
      output: result.output,
      config: operation.config,
      metrics: {
        latencyMs,
        inputTokens: operation.input.tokenCount || 0,
        outputTokens: result.output.tokenCount || 0,
        totalTokens: (operation.input.tokenCount || 0) + (result.output.tokenCount || 0),
        estimatedCost: calculateCost(operation.provider, operation.modelId, operation.input.tokenCount || 0, result.output.tokenCount || 0),
      },
      confidence: result.confidence,
      userId: operation.userId,
      tenantId: operation.tenantId,
      investigationId: operation.investigationId,
      correlationId: operation.correlationId,
    });

    return { attributionId, result };
  };
}

/**
 * Estimate cost based on provider and model
 */
function calculateCost(
  provider: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Rough cost estimates per 1K tokens
  const rates: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    default: { input: 0.001, output: 0.002 },
  };

  const rate = rates[modelId] || rates.default;
  return (inputTokens * rate.input + outputTokens * rate.output) / 1000;
}
