/**
 * Enhanced token counting with provider-aware tokenization, pricing registry, and caching
 * Supports precise tokenization, billing rounding, and post-hoc reconciliation
 */

import LRU from 'lru-cache';
import logger from '../utils/logger';

/** Supported LLM providers. */
export type Provider = 'openai' | 'anthropic' | 'gemini';
/** Part of the LLM interaction (prompt or completion). */
export type Part = 'prompt' | 'completion';

/**
 * Input parameters for estimating token usage.
 */
export interface EstimateInput {
  payload: {
    messages?: any[];
    input?: string | object;
    tools?: any[];
    systemPrompt?: string;
    maxTokens?: number;
  };
  provider?: Provider;
  model?: string;
}

/**
 * Output of the token usage estimation.
 */
export interface EstimateOutput {
  provider: Provider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptUSD: number;
  completionUSD: number;
  totalUSD: number;
  cacheHit: boolean;
  estimationMethod: 'precise' | 'heuristic' | 'cached' | 'reconciled';
}

/**
 * Result of reconciling estimated usage with actual usage data.
 */
export interface ReconciliationResult extends EstimateOutput {
  reconciliationType: 'provider_api' | 'usage_logs' | 'billing_data';
  reconciliationConfidence: number; // 0-1
}

/**
 * Comprehensive pricing registry with model-specific billing rules
 */
const PRICING_REGISTRY: Record<
  Provider,
  Record<
    string,
    {
      per1k: { prompt: number; completion: number };
      minBillableTokens?: number;
      roundingUnit?: number; // Round up to nearest unit
      maxContextTokens?: number;
      deprecationDate?: string;
      tier?: 'standard' | 'premium' | 'enterprise';
    }
  >
> = {
  openai: {
    'gpt-4o': {
      per1k: { prompt: 0.0025, completion: 0.01 },
      maxContextTokens: 128000,
      tier: 'premium',
    },
    'gpt-4o-mini': {
      per1k: { prompt: 0.00015, completion: 0.0006 },
      maxContextTokens: 128000,
      tier: 'standard',
    },
    'gpt-4-turbo': {
      per1k: { prompt: 0.01, completion: 0.03 },
      maxContextTokens: 128000,
      tier: 'premium',
    },
    'gpt-3.5-turbo': {
      per1k: { prompt: 0.0005, completion: 0.0015 },
      maxContextTokens: 16385,
      tier: 'standard',
      deprecationDate: '2024-06-13',
    },
  },
  anthropic: {
    'claude-3-5-sonnet-20241022': {
      per1k: { prompt: 0.003, completion: 0.015 },
      maxContextTokens: 200000,
      tier: 'premium',
    },
    'claude-3-opus': {
      per1k: { prompt: 0.015, completion: 0.075 },
      maxContextTokens: 200000,
      tier: 'enterprise',
    },
    'claude-3-haiku': {
      per1k: { prompt: 0.00025, completion: 0.00125 },
      maxContextTokens: 200000,
      tier: 'standard',
    },
  },
  gemini: {
    'gemini-1.5-pro': {
      per1k: { prompt: 0.00125, completion: 0.005 },
      maxContextTokens: 1048576,
      tier: 'premium',
    },
    'gemini-1.5-flash': {
      per1k: { prompt: 0.000075, completion: 0.0003 },
      maxContextTokens: 1048576,
      tier: 'standard',
    },
  },
};

/**
 * LRU cache for token count estimates (5-minute TTL, 10k entries max)
 */
const tokenCache = new LRU({
  max: 10000,
  ttl: 5 * 60 * 1000, // 5 minutes
  updateAgeOnGet: true,
}) as any;

/**
 * Apply provider-specific billing rounding rules
 */
function applyBillingRounding(
  tokens: number,
  rules?: {
    minBillableTokens?: number;
    roundingUnit?: number;
  },
): number {
  if (!rules) return tokens;

  let billableTokens = Math.max(tokens, rules.minBillableTokens || 0);

  if (rules.roundingUnit && rules.roundingUnit > 1) {
    billableTokens =
      Math.ceil(billableTokens / rules.roundingUnit) * rules.roundingUnit;
  }

  return billableTokens;
}

/**
 * Precise tokenization using provider-specific tokenizers
 */
async function tokenizePrecise(
  payload: any,
  provider: Provider,
  model: string,
): Promise<{ prompt: number; method: 'precise' | 'heuristic' }> {
  try {
    switch (provider) {
      case 'openai':
        // Use gpt-tokenizer for precise OpenAI counting
        try {
          const { encode } = await import('gpt-tokenizer');
          const text = serializePayload(payload);
          const tokens = encode(text, model).length;
          return { prompt: tokens, method: 'precise' };
        } catch (error) {
          logger.warn('GPT tokenizer failed, falling back to heuristic', {
            error: error instanceof Error ? error.message : String(error),
          });
          return tokenizeHeuristic(payload, provider);
        }

      case 'anthropic':
        // Anthropic tokenizer would go here when available
        // For now, use calibrated heuristic
        return tokenizeHeuristic(payload, provider);

      case 'gemini':
        // Gemini tokenizer would go here when available
        // For now, use calibrated heuristic
        return tokenizeHeuristic(payload, provider);

      default:
        return tokenizeHeuristic(payload, provider);
    }
  } catch (error) {
    logger.error('Precise tokenization failed', {
      provider,
      model,
      error: error instanceof Error ? error.message : String(error),
    });
    return tokenizeHeuristic(payload, provider);
  }
}

/**
 * Heuristic tokenization with provider-specific calibration
 */
function tokenizeHeuristic(
  payload: any,
  provider: Provider,
): { prompt: number; method: 'heuristic' } {
  const text = serializePayload(payload);
  const baseLength = text.length;

  // Provider-specific heuristics based on empirical data
  let charsPerToken: number;
  switch (provider) {
    case 'openai':
      charsPerToken = 4.0; // GPT models average ~4 chars/token
      break;
    case 'anthropic':
      charsPerToken = 3.5; // Claude is slightly more efficient
      break;
    case 'gemini':
      charsPerToken = 4.2; // Gemini slightly less efficient
      break;
    default:
      charsPerToken = 4.0;
  }

  // Add overhead for message structure, tool definitions, etc.
  let overhead = 0;
  if (payload.messages) {
    overhead += payload.messages.length * 3; // Role tokens + delimiters
  }
  if (payload.tools) {
    overhead += payload.tools.length * 20; // Tool definition overhead
  }
  if (payload.systemPrompt) {
    overhead += 10; // System prompt formatting
  }

  const estimatedTokens = Math.ceil(baseLength / charsPerToken) + overhead;
  return { prompt: Math.max(1, estimatedTokens), method: 'heuristic' };
}

/**
 * Serialize payload to text for tokenization
 */
function serializePayload(payload: any): string {
  if (typeof payload === 'string') {
    return payload;
  }

  let text = '';

  if (payload.messages && Array.isArray(payload.messages)) {
    text += payload.messages
      .map((msg: any) => `${msg.role || 'user'}: ${msg.content || ''}`)
      .join('\n');
  }

  if (payload.input) {
    text +=
      typeof payload.input === 'string'
        ? payload.input
        : JSON.stringify(payload.input);
  }

  if (payload.systemPrompt) {
    text = payload.systemPrompt + '\n' + text;
  }

  if (payload.tools && Array.isArray(payload.tools)) {
    const toolsText = payload.tools
      .map((tool: any) => JSON.stringify(tool))
      .join('\n');
    text += '\nTools: ' + toolsText;
  }

  return text || JSON.stringify(payload);
}

/**
 * Create cache key for tokenization results
 */
function createCacheKey(
  payload: any,
  provider: Provider,
  model: string,
): string {
  const payloadHash = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .slice(0, 32);
  return `${provider}:${model}:${payloadHash}`;
}

/**
 * Get default model for provider
 */
function getDefaultModel(provider: Provider): string {
  const models = Object.keys(PRICING_REGISTRY[provider]);
  return models[0] || 'unknown';
}

/**
 * Estimates tokens and costs for a given payload using caching and precise/heuristic methods.
 *
 * @param {EstimateInput} input - The input payload and model information.
 * @returns {Promise<EstimateOutput>} The estimated tokens and costs.
 * @throws {Error} If no pricing information is available for the specified model.
 */
export async function estimateTokensAndCost(
  input: EstimateInput,
): Promise<EstimateOutput> {
  const provider = input.provider || 'openai';
  const model = input.model || getDefaultModel(provider);

  // Validate model exists
  const pricing = PRICING_REGISTRY[provider]?.[model];
  if (!pricing) {
    throw new Error(
      `No pricing information available for ${provider}:${model}`,
    );
  }

  // Check cache first
  const cacheKey = createCacheKey(input.payload, provider, model);
  const cached = tokenCache.get(cacheKey);

  let promptTokens: number;
  let estimationMethod: 'precise' | 'heuristic' | 'cached' | 'reconciled';
  let cacheHit = false;

  if (cached && Date.now() - cached.timestamp < 300000) {
    // 5-minute cache
    promptTokens = cached.tokens;
    estimationMethod = 'cached';
    cacheHit = true;
  } else {
    // Perform tokenization
    const tokenResult = await tokenizePrecise(input.payload, provider, model);
    promptTokens = tokenResult.prompt;
    estimationMethod = tokenResult.method;

    // Cache the result
    tokenCache.set(cacheKey, {
      tokens: promptTokens,
      method: estimationMethod,
      timestamp: Date.now(),
    });
  }

  // Estimate completion tokens (if not provided)
  let completionTokens = 0;
  if (input.payload.maxTokens) {
    // Use provided max tokens as completion estimate
    completionTokens = Math.min(
      input.payload.maxTokens,
      pricing.maxContextTokens || Infinity,
    );
  } else {
    // Default heuristic: 20% of prompt tokens, capped at 1000
    completionTokens = Math.min(Math.ceil(promptTokens * 0.2), 1000);
  }

  // Apply billing rounding
  const billedPromptTokens = applyBillingRounding(promptTokens, pricing);
  const billedCompletionTokens = applyBillingRounding(
    completionTokens,
    pricing,
  );

  // Calculate costs
  const promptUSD = (billedPromptTokens / 1000) * pricing.per1k.prompt;
  const completionUSD =
    (billedCompletionTokens / 1000) * pricing.per1k.completion;
  const totalUSD = +(promptUSD + completionUSD).toFixed(6);

  return {
    provider,
    model,
    promptTokens: billedPromptTokens,
    completionTokens: billedCompletionTokens,
    totalTokens: billedPromptTokens + billedCompletionTokens,
    promptUSD,
    completionUSD,
    totalUSD,
    cacheHit,
    estimationMethod,
  };
}

/**
 * Reconciles estimated usage with actual usage data from the provider or logs.
 *
 * @param {EstimateOutput} estimated - The original estimated usage.
 * @param {object} actualData - The actual usage data.
 * @param {object} [actualData.tokens] - Actual token counts.
 * @param {number} actualData.tokens.prompt - Actual prompt tokens.
 * @param {number} actualData.tokens.completion - Actual completion tokens.
 * @param {number} [actualData.cost] - Actual cost.
 * @param {'provider_api' | 'usage_logs' | 'billing_data'} actualData.source - Source of the actual data.
 * @returns {Promise<ReconciliationResult | null>} The reconciled result or null if reconciliation fails.
 */
export async function reconcileActualUsage(
  estimated: EstimateOutput,
  actualData?: {
    tokens?: { prompt: number; completion: number };
    cost?: number;
    source: 'provider_api' | 'usage_logs' | 'billing_data';
  },
): Promise<ReconciliationResult | null> {
  if (!actualData) return null;

  try {
    let actualTokens = actualData.tokens;
    let actualCost = actualData.cost;
    let confidence = 1.0;

    // If we have actual token counts, recalculate cost
    if (actualTokens) {
      const pricing = PRICING_REGISTRY[estimated.provider]?.[estimated.model];
      if (pricing) {
        const promptCost = (actualTokens.prompt / 1000) * pricing.per1k.prompt;
        const completionCost =
          (actualTokens.completion / 1000) * pricing.per1k.completion;
        actualCost = +(promptCost + completionCost).toFixed(6);
      }
    } else if (actualCost && actualCost > 0) {
      // Reverse-engineer token counts from cost (less reliable)
      const pricing = PRICING_REGISTRY[estimated.provider]?.[estimated.model];
      if (pricing) {
        // Assume same ratio of prompt/completion as estimated
        const promptRatio = estimated.promptTokens / estimated.totalTokens;
        const completionRatio =
          estimated.completionTokens / estimated.totalTokens;

        // This is approximate due to rounding and billing complexities
        const totalTokensFromCost =
          (actualCost * 1000) /
          (pricing.per1k.prompt * promptRatio +
            pricing.per1k.completion * completionRatio);

        actualTokens = {
          prompt: Math.round(totalTokensFromCost * promptRatio),
          completion: Math.round(totalTokensFromCost * completionRatio),
        };
        confidence = 0.7; // Lower confidence for reverse-engineered data
      }
    }

    if (!actualTokens || !actualCost) return null;

    return {
      ...estimated,
      promptTokens: actualTokens.prompt,
      completionTokens: actualTokens.completion,
      totalTokens: actualTokens.prompt + actualTokens.completion,
      promptUSD:
        (actualTokens.prompt / 1000) *
        PRICING_REGISTRY[estimated.provider][estimated.model].per1k.prompt,
      completionUSD:
        (actualTokens.completion / 1000) *
        PRICING_REGISTRY[estimated.provider][estimated.model].per1k.completion,
      totalUSD: actualCost,
      reconciliationType: actualData.source,
      reconciliationConfidence: confidence,
      estimationMethod: 'reconciled',
    };
  } catch (error) {
    logger.error('Token usage reconciliation failed', {
      error: error instanceof Error ? error.message : String(error),
      estimated,
      actualData,
    });
    return null;
  }
}

/**
 * Retrieves pricing information for a specific model.
 *
 * @param {Provider} provider - The provider name.
 * @param {string} model - The model name.
 * @returns {object | null} The pricing information or null if not found.
 */
export function getModelPricing(provider: Provider, model: string) {
  return PRICING_REGISTRY[provider]?.[model] || null;
}

/**
 * Lists all supported models and their pricing.
 *
 * @returns {Array<{ provider: Provider, model: string, pricing: any }>} An array of supported models with pricing.
 */
export function getSupportedModels(): Array<{
  provider: Provider;
  model: string;
  pricing: (typeof PRICING_REGISTRY)[Provider][string];
}> {
  const models: Array<{
    provider: Provider;
    model: string;
    pricing: (typeof PRICING_REGISTRY)[Provider][string];
  }> = [];

  for (const [provider, providerModels] of Object.entries(PRICING_REGISTRY)) {
    for (const [model, pricing] of Object.entries(providerModels)) {
      models.push({
        provider: provider as Provider,
        model,
        pricing,
      });
    }
  }

  return models;
}

/**
 * Retrieves current cache statistics.
 *
 * @returns {object} Cache statistics including size, max size, and hit rate.
 */
export function getCacheStats() {
  return {
    size: tokenCache.size,
    maxSize: tokenCache.max,
    hitRate: tokenCache.calculatedSize || 0, // Simplified stat
  };
}
