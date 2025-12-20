// @ts-nocheck
import { ProviderAdapter, LLMRequest, RoutingPolicy, LLMResponse, SafetyGuardrail } from './types.js';
import { LLMCache } from './cache.js';
import { ReplayLog } from './replay.js';
import { RoutingError, ProviderError, SafetyViolationError } from './errors.js';
import { randomUUID } from 'crypto';

export class LLMRouter {
  private providers: Map<string, ProviderAdapter> = new Map();
  private policies: RoutingPolicy[] = [];
  private guardrails: SafetyGuardrail[] = [];
  private cache: LLMCache;
  private replayLog: ReplayLog;

  constructor(config: {
    providers: ProviderAdapter[];
    policies?: RoutingPolicy[];
    guardrails?: SafetyGuardrail[];
    cacheTTL?: number;
    logDir?: string;
  }) {
    config.providers.forEach(p => this.providers.set(p.name, p));
    this.policies = config.policies || [];
    this.guardrails = config.guardrails || [];
    this.cache = new LLMCache(config.cacheTTL);
    this.replayLog = new ReplayLog(config.logDir);
  }

  async route(request: Partial<LLMRequest>): Promise<LLMResponse> {
    let fullRequest: LLMRequest = {
      id: request.id || randomUUID(),
      messages: request.messages || [],
      ...request
    } as LLMRequest;

    // 1. Safety Guardrails (Pre-Processing)
    try {
        for (const guard of this.guardrails) {
            fullRequest = await guard.validateRequest(fullRequest);
        }
    } catch (err: any) {
        throw new SafetyViolationError('Pre-processing', err.message);
    }

    // 2. Check Cache
    const cacheKey = this.cache.generateKey(fullRequest);
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) {
      await this.replayLog.log(fullRequest, cachedResponse);
      return cachedResponse;
    }

    // 3. Determine Candidates
    let candidates = Array.from(this.providers.values());

    // Filter by specific model request if present
    if (fullRequest.model) {
        candidates = candidates.filter(p => p.supports(fullRequest.model!));
    } else if (fullRequest.tags && fullRequest.tags.length > 0) {
        candidates = candidates.filter(p => {
            return p.getCapabilities().some(cap =>
                fullRequest.tags!.every(tag => cap.tags.includes(tag))
            );
        });
    }

    if (candidates.length === 0) {
        throw new RoutingError('No providers available for this request');
    }

    // 4. Apply Policies
    for (const policy of this.policies) {
        candidates = await policy.sortProviders(candidates, fullRequest);
    }

    if (candidates.length === 0) {
        throw new RoutingError('All providers filtered out by policies');
    }

    // 5. Execution with Fallback
    let lastError: Error | null = null;
    let finalResponse: LLMResponse | null = null;

    for (const provider of candidates) {
      try {
        const response = await provider.generate(fullRequest);
        finalResponse = response;
        break; // Success
      } catch (error: any) {
        console.error(`Provider ${provider.name} failed:`, error);
        // Wrap error if it's not already a ProviderError (though we don't rethrow here)
        lastError = error instanceof ProviderError ? error : new ProviderError(provider.name, error.message, error);
        // Continue to next provider
      }
    }

    if (!finalResponse) {
        const failureResponse = {
            id: randomUUID(),
            requestId: fullRequest.id,
            provider: 'mock' as any,
            model: 'error',
            text: '',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            latencyMs: 0,
            cached: false
        };
        await this.replayLog.log(fullRequest, failureResponse, lastError!);
        throw new RoutingError(`All providers failed. Last error: ${lastError?.message}`);
    }

    // 6. Safety Guardrails (Post-Processing)
    try {
        for (const guard of this.guardrails) {
            finalResponse = await guard.validateResponse(finalResponse);
        }
    } catch (err: any) {
        throw new SafetyViolationError('Post-processing', err.message);
    }

    // 7. Cache & Log
    this.cache.set(cacheKey, finalResponse);
    await this.replayLog.log(fullRequest, finalResponse);

    return finalResponse;
  }

  registerProvider(provider: ProviderAdapter) {
    this.providers.set(provider.name, provider);
  }
}
