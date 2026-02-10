/**
 * Governance LLM Client
 *
 * Specialized LLM client for AI-assisted governance operations.
 * Integrates with the existing LLMRouter infrastructure while providing
 * governance-specific prompts, caching, and safety measures.
 *
 * @module ai/governance/llm/GovernanceLLMClient
 * @version 4.0.0
 */

import { createHash } from 'crypto';
import { LLMRouter } from '../../../services/llm/LLMRouter.ts';
import { LLMRequest, LLMResult, LLMRouterConfig } from '../../../services/llm/interfaces.ts';
import { GovernanceVerdict } from '../../../governance/types.ts';
import { ProvenanceMetadata, ChainOfCustodyEntry } from '../types.ts';
import logger from '../../../utils/logger.ts';

// =============================================================================
// Types
// =============================================================================

export interface GovernanceLLMRequest {
  taskType: GovernanceLLMTaskType;
  prompt: string;
  context?: GovernanceLLMContext;
  tenantId: string;
  userId?: string;
  maxTokens?: number;
  temperature?: number;
}

export type GovernanceLLMTaskType =
  | 'policy_suggestion'
  | 'verdict_explanation'
  | 'anomaly_analysis'
  | 'gap_detection'
  | 'conflict_resolution';

export interface GovernanceLLMContext {
  policies?: Array<{ id: string; name: string; description?: string }>;
  complianceFrameworks?: string[];
  recentVerdicts?: GovernanceVerdict[];
  userRole?: string;
  sensitivityLevel?: 'low' | 'medium' | 'high';
}

export interface GovernanceLLMResponse {
  text: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cached: boolean;
  latencyMs: number;
  provenance: ProvenanceMetadata;
  governanceVerdict: GovernanceVerdict;
}

export interface GovernanceLLMConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'ollama' | 'mock';
  model: string;
  fallbackModel?: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  cache: {
    enabled: boolean;
    ttlSeconds: number;
    maxEntries: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  safety: {
    piiRedaction: boolean;
    contentFilter: boolean;
    maxInputLength: number;
  };
}

// =============================================================================
// Cache Implementation
// =============================================================================

interface CacheEntry {
  response: GovernanceLLMResponse;
  expiresAt: number;
}

class LLMResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries: number;
  private ttlSeconds: number;

  constructor(maxEntries: number, ttlSeconds: number) {
    this.maxEntries = maxEntries;
    this.ttlSeconds = ttlSeconds;
  }

  private generateKey(request: GovernanceLLMRequest): string {
    const keyData = JSON.stringify({
      taskType: request.taskType,
      prompt: request.prompt,
      context: request.context,
      tenantId: request.tenantId,
    });
    return createHash('sha256').update(keyData).digest('hex');
  }

  get(request: GovernanceLLMRequest): GovernanceLLMResponse | null {
    const key = this.generateKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return { ...entry.response, cached: true };
  }

  set(request: GovernanceLLMRequest, response: GovernanceLLMResponse): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const key = this.generateKey(request);
    this.cache.set(key, {
      response,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// =============================================================================
// Rate Limiter
// =============================================================================

interface RateLimitBucket {
  requests: number;
  tokens: number;
  windowStart: number;
}

class GovernanceRateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map();
  private requestsPerMinute: number;
  private tokensPerMinute: number;

  constructor(requestsPerMinute: number, tokensPerMinute: number) {
    this.requestsPerMinute = requestsPerMinute;
    this.tokensPerMinute = tokensPerMinute;
  }

  async checkLimit(tenantId: string, estimatedTokens: number): Promise<{ allowed: boolean; retryAfterMs?: number }> {
    const now = Date.now();
    const windowMs = 60 * 1000;

    let bucket = this.buckets.get(tenantId);

    // Reset bucket if window expired
    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { requests: 0, tokens: 0, windowStart: now };
      this.buckets.set(tenantId, bucket);
    }

    // Check limits
    if (bucket.requests >= this.requestsPerMinute) {
      const retryAfterMs = windowMs - (now - bucket.windowStart);
      return { allowed: false, retryAfterMs };
    }

    if (bucket.tokens + estimatedTokens > this.tokensPerMinute) {
      const retryAfterMs = windowMs - (now - bucket.windowStart);
      return { allowed: false, retryAfterMs };
    }

    return { allowed: true };
  }

  recordUsage(tenantId: string, tokens: number): void {
    const bucket = this.buckets.get(tenantId);
    if (bucket) {
      bucket.requests++;
      bucket.tokens += tokens;
    }
  }
}

// =============================================================================
// Main Client Implementation
// =============================================================================

const DEFAULT_CONFIG: GovernanceLLMConfig = {
  enabled: true,
  provider: 'mock',
  model: 'gpt-4',
  maxTokens: 2048,
  temperature: 0.3,
  timeout: 30000,
  cache: {
    enabled: true,
    ttlSeconds: 300,
    maxEntries: 1000,
  },
  rateLimit: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
  },
  safety: {
    piiRedaction: true,
    contentFilter: true,
    maxInputLength: 10000,
  },
};

export class GovernanceLLMClient {
  private config: GovernanceLLMConfig;
  private llmRouter: LLMRouter | null = null;
  private cache: LLMResponseCache;
  private rateLimiter: GovernanceRateLimiter;
  private initialized = false;

  constructor(config: Partial<GovernanceLLMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new LLMResponseCache(
      this.config.cache.maxEntries,
      this.config.cache.ttlSeconds
    );
    this.rateLimiter = new GovernanceRateLimiter(
      this.config.rateLimit.requestsPerMinute,
      this.config.rateLimit.tokensPerMinute
    );
  }

  /**
   * Initialize the LLM client
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const routerConfig: LLMRouterConfig = {
      providers: [
        {
          name: this.config.provider,
          type: this.config.provider,
          apiKeyEnv: this.getApiKeyEnvVar(),
          models: {
            policy_suggestion: this.config.model,
            verdict_explanation: this.config.model,
            anomaly_analysis: this.config.model,
            gap_detection: this.config.model,
            conflict_resolution: this.config.model,
          },
        },
      ],
      routing: {
        defaultPolicy: 'cost-control',
      },
    };

    this.llmRouter = new LLMRouter(routerConfig);
    this.initialized = true;

    logger.info({ config: this.config }, 'GovernanceLLMClient initialized');
  }

  /**
   * Execute a governance LLM request
   */
  async execute(request: GovernanceLLMRequest): Promise<GovernanceLLMResponse> {
    if (!this.config.enabled) {
      throw new GovernanceLLMError('LLM_DISABLED', 'AI governance features are disabled');
    }

    await this.initialize();

    const startTime = Date.now();

    // Check cache first
    if (this.config.cache.enabled) {
      const cachedResponse = this.cache.get(request);
      if (cachedResponse) {
        logger.debug({ taskType: request.taskType, cached: true }, 'Cache hit');
        return cachedResponse;
      }
    }

    // Check rate limit
    const estimatedTokens = this.estimateTokens(request.prompt);
    const rateLimitResult = await this.rateLimiter.checkLimit(request.tenantId, estimatedTokens);

    if (!rateLimitResult.allowed) {
      throw new GovernanceLLMError(
        'RATE_LIMITED',
        `Rate limit exceeded. Retry after ${rateLimitResult.retryAfterMs}ms`,
        { retryAfterMs: rateLimitResult.retryAfterMs }
      );
    }

    // Apply safety measures
    const sanitizedPrompt = this.applySafetyMeasures(request.prompt);

    // Build LLM request
    const llmRequest: LLMRequest = {
      taskType: request.taskType,
      prompt: this.buildPrompt(request.taskType, sanitizedPrompt, request.context),
      tenantId: request.tenantId,
      metadata: {
        userId: request.userId,
        governance: true,
      },
    };

    // Execute request
    let result: LLMResult;
    try {
      result = await this.llmRouter!.execute(llmRequest);
    } catch (error: any) {
      logger.error({ error, taskType: request.taskType }, 'LLM request failed');
      throw new GovernanceLLMError('LLM_ERROR', error.message);
    }

    if (!result.ok) {
      throw new GovernanceLLMError('LLM_ERROR', result.error || 'Unknown LLM error');
    }

    // Record usage
    const totalTokens = result.usage?.total_tokens || estimatedTokens;
    this.rateLimiter.recordUsage(request.tenantId, totalTokens);

    const latencyMs = Date.now() - startTime;

    // Build response with governance wrapping
    const response: GovernanceLLMResponse = {
      text: result.text || '',
      model: result.model || this.config.model,
      provider: result.provider || this.config.provider,
      usage: {
        promptTokens: result.usage?.prompt_tokens || 0,
        completionTokens: result.usage?.completion_tokens || 0,
        totalTokens,
      },
      cached: false,
      latencyMs,
      provenance: this.buildProvenance(request, result),
      governanceVerdict: this.buildGovernanceVerdict(request, latencyMs),
    };

    // Cache response
    if (this.config.cache.enabled) {
      this.cache.set(request, response);
    }

    logger.info({
      taskType: request.taskType,
      latencyMs,
      tokens: totalTokens,
      cached: false,
    }, 'LLM request completed');

    return response;
  }

  /**
   * Execute with automatic retry on transient failures
   */
  async executeWithRetry(
    request: GovernanceLLMRequest,
    maxRetries: number = 3
  ): Promise<GovernanceLLMResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(request);
      } catch (error: any) {
        lastError = error;

        // Don't retry on non-transient errors
        if (error.code === 'LLM_DISABLED' || error.code === 'RATE_LIMITED') {
          throw error;
        }

        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warn({ attempt, backoffMs, error: error.message }, 'Retrying LLM request');
          await this.sleep(backoffMs);
        }
      }
    }

    throw lastError;
  }

  /**
   * Clear the response cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('LLM response cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size(),
      maxSize: this.config.cache.maxEntries,
    };
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  private getApiKeyEnvVar(): string {
    switch (this.config.provider) {
      case 'openai':
        return 'OPENAI_API_KEY';
      case 'anthropic':
        return 'ANTHROPIC_API_KEY';
      default:
        return 'MOCK_API_KEY';
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private applySafetyMeasures(prompt: string): string {
    let sanitized = prompt;

    // Truncate if too long
    if (this.config.safety.maxInputLength && sanitized.length > this.config.safety.maxInputLength) {
      sanitized = sanitized.substring(0, this.config.safety.maxInputLength);
      logger.warn({ originalLength: prompt.length }, 'Prompt truncated');
    }

    // PII redaction (basic patterns)
    if (this.config.safety.piiRedaction) {
      // SSN pattern
      sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]');
      // Email pattern
      sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED-EMAIL]');
      // Phone pattern
      sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED-PHONE]');
    }

    return sanitized;
  }

  private buildPrompt(
    taskType: GovernanceLLMTaskType,
    userPrompt: string,
    context?: GovernanceLLMContext
  ): string {
    const systemPrompts: Record<GovernanceLLMTaskType, string> = {
      policy_suggestion: `You are an AI governance policy analyst. Analyze the provided context and suggest policy improvements. Your suggestions must be specific, actionable, and aligned with compliance frameworks. Output structured JSON.`,

      verdict_explanation: `You are an AI governance explainer. Transform technical governance verdicts into clear, human-readable explanations. Tailor your language to the specified audience. Be concise but thorough.`,

      anomaly_analysis: `You are a security analyst specializing in behavioral anomaly detection. Analyze the provided behavior patterns and identify potential security concerns. Rate severity and provide actionable recommendations.`,

      gap_detection: `You are a compliance analyst. Identify gaps between current policies and compliance requirements. Reference specific framework controls and provide remediation guidance.`,

      conflict_resolution: `You are a policy conflict resolver. Analyze overlapping policies and suggest how to consolidate or prioritize them without breaking existing workflows.`,
    };

    let prompt = systemPrompts[taskType] + '\n\n';

    if (context) {
      prompt += 'CONTEXT:\n';
      if (context.policies?.length) {
        prompt += `Existing Policies: ${JSON.stringify(context.policies)}\n`;
      }
      if (context.complianceFrameworks?.length) {
        prompt += `Compliance Frameworks: ${context.complianceFrameworks.join(', ')}\n`;
      }
      if (context.userRole) {
        prompt += `User Role: ${context.userRole}\n`;
      }
      prompt += '\n';
    }

    prompt += `REQUEST:\n${userPrompt}`;

    return prompt;
  }

  private buildProvenance(request: GovernanceLLMRequest, result: LLMResult): ProvenanceMetadata {
    const inputHash = createHash('sha256').update(request.prompt).digest('hex');
    const outputHash = createHash('sha256').update(result.text || '').digest('hex');

    const custodyEntry: ChainOfCustodyEntry = {
      timestamp: new Date().toISOString(),
      actor: `llm:${this.config.provider}:${result.model || this.config.model}`,
      action: `generate:${request.taskType}`,
      hash: outputHash,
    };

    return {
      sourceId: `governance-llm-${this.config.provider}`,
      sourceType: 'ai_model',
      modelVersion: result.model || this.config.model,
      modelProvider: this.config.provider,
      inputHash,
      outputHash,
      timestamp: new Date().toISOString(),
      confidence: this.calculateConfidence(result),
      chainOfCustody: [custodyEntry],
    };
  }

  private buildGovernanceVerdict(request: GovernanceLLMRequest, latencyMs: number): GovernanceVerdict {
    return {
      action: 'ALLOW',
      reasons: [`AI governance output for ${request.taskType}`],
      policyIds: ['ai-governance-policy'],
      metadata: {
        timestamp: new Date().toISOString(),
        evaluator: 'governance-llm-client',
        latencyMs,
        simulation: false,
      },
      provenance: {
        origin: `ai-governance:${request.taskType}`,
        confidence: 0.95,
      },
    };
  }

  private calculateConfidence(result: LLMResult): number {
    // Base confidence based on successful response
    let confidence = 0.85;

    // Adjust based on response length (very short might indicate issues)
    if (result.text && result.text.length > 100) {
      confidence += 0.05;
    }

    // Cap at 0.95 for AI-generated content
    return Math.min(confidence, 0.95);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Error Class
// =============================================================================

export class GovernanceLLMError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GovernanceLLMError';
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let defaultClient: GovernanceLLMClient | null = null;

export function getGovernanceLLMClient(config?: Partial<GovernanceLLMConfig>): GovernanceLLMClient {
  if (!defaultClient) {
    defaultClient = new GovernanceLLMClient(config);
  }
  return defaultClient;
}

export function createGovernanceLLMClient(config?: Partial<GovernanceLLMConfig>): GovernanceLLMClient {
  return new GovernanceLLMClient(config);
}
