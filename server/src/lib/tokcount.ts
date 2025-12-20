/**
 * Token counting utility for multi-provider LLM budgeting
 * Supports OpenAI, Anthropic, and Gemini models with pluggable counting
 */

export type ModelFamily = 'openai' | 'anthropic' | 'gemini';
export type TokCountResult = {
  model: string;
  prompt: number;
  completion?: number;
  total: number;
  estimatedCostUSD?: number;
};

// Model pricing per 1K tokens (input/output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI GPT-4 family
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },

  // Anthropic Claude family
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },

  // Gemini family
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
};

export function countOpenAITokens(model: string, text: string): number {
  try {
    // Use gpt-tokenizer for accurate OpenAI counts
    const { encode } = require('gpt-tokenizer');
    return encode(text, model).length;
  } catch (error) {
    // Fallback estimation: ~4 chars per token
    return Math.max(1, Math.round(text.length / 4));
  }
}

export function countAnthropicTokens(text: string): number {
  // Anthropic estimation: ~3.5 chars per token (slightly more efficient than GPT)
  return Math.max(1, Math.round(text.length / 3.5));
}

export function countGeminiTokens(text: string): number {
  // Gemini estimation: ~4 chars per token
  return Math.max(1, Math.round(text.length / 4));
}

export async function countTokens(
  provider: ModelFamily,
  model: string,
  prompt: string,
  completion?: string,
): Promise<TokCountResult> {
  let promptTokens = 0;
  let completionTokens = 0;

  switch (provider) {
    case 'openai':
      promptTokens = countOpenAITokens(model, prompt);
      completionTokens = completion ? countOpenAITokens(model, completion) : 0;
      break;

    case 'anthropic':
      promptTokens = countAnthropicTokens(prompt);
      completionTokens = completion ? countAnthropicTokens(completion) : 0;
      break;

    case 'gemini':
      promptTokens = countGeminiTokens(prompt);
      completionTokens = completion ? countGeminiTokens(completion) : 0;
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  const total = promptTokens + completionTokens;

  // Calculate estimated cost
  let estimatedCostUSD = 0;
  const pricing = MODEL_PRICING[model];
  if (pricing) {
    estimatedCostUSD =
      (promptTokens * pricing.input) / 1000 +
      (completionTokens * pricing.output) / 1000;
  }

  return {
    model,
    prompt: promptTokens,
    completion: completionTokens,
    total,
    estimatedCostUSD: Number(estimatedCostUSD.toFixed(6)),
  };
}

export function getModelFamily(model: string): ModelFamily {
  if (model.startsWith('gpt-') || model.includes('openai')) return 'openai';
  if (model.startsWith('claude-') || model.includes('anthropic'))
    return 'anthropic';
  if (model.startsWith('gemini-') || model.includes('google')) return 'gemini';

  // Default to openai for unknown models
  return 'openai';
}

export function validateTokenBudget(
  tokens: number,
  budgetLimit: number = 120000,
): {
  withinBudget: boolean;
  percentUsed: number;
  recommendAction: 'proceed' | 'warn' | 'block';
} {
  const percentUsed = (tokens / budgetLimit) * 100;

  let recommendAction: 'proceed' | 'warn' | 'block' = 'proceed';
  if (percentUsed >= 100) recommendAction = 'block';
  else if (percentUsed >= 80) recommendAction = 'warn';

  return {
    withinBudget: tokens <= budgetLimit,
    percentUsed: Number(percentUsed.toFixed(2)),
    recommendAction,
  };
}

export async function countVertexTokensExact(
  model: string,
  text: string,
): Promise<number> {
  // For production: exact token count from Vertex AI
  // This would call the actual Vertex Count Tokens API
  // For now, fallback to estimation
  return countGeminiTokens(text);
}
