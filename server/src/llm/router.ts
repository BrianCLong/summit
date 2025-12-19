import {
  ProviderAdapter,
  LLMRequest,
  RoutingPolicy,
  LLMResponse,
  SafetyGuardrail,
  ModelClass,
} from './types.js';
import { LLMCache } from './cache.js';
import { ReplayLog } from './replay.js';
import { RoutingError, ProviderError, SafetyViolationError } from './errors.js';
import { randomUUID } from 'crypto';
import { LlmPolicyStore } from './policy-store.js';
import { CostTracker } from './cost-tracker.js';
import { AbuseConfig, AbuseDetector, SecurityEvent } from './abuse-detector.js';
import { metrics } from '../observability/metrics/metrics.js';

const CLASS_ORDER: ModelClass[] = ['cheap', 'fast', 'balanced', 'premium'];
const DEFAULT_ABUSE_CONFIG: AbuseConfig = {
  failureThreshold: 4,
  windowSeconds: 300,
  suspiciousPatterns: ['system prompt', 'ignore previous instructions', 'print the system prompt'],
};

export class LLMRouter {
  private providers: Map<string, ProviderAdapter> = new Map();
  private policies: RoutingPolicy[] = [];
  private guardrails: SafetyGuardrail[] = [];
  private cache: LLMCache;
  private replayLog: ReplayLog;
  private policyStore: LlmPolicyStore;
  private costTracker: CostTracker;
  private abuseDetector: AbuseDetector;
  private requestWindow: Map<string, number[]> = new Map();

  constructor(config: {
    providers: ProviderAdapter[];
    policies?: RoutingPolicy[];
    guardrails?: SafetyGuardrail[];
    cacheTTL?: number;
    logDir?: string;
    policyStore?: LlmPolicyStore;
    costTracker?: CostTracker;
    abuseDetector?: AbuseDetector;
  }) {
    config.providers.forEach((p) => this.providers.set(p.name, p));
    this.policies = config.policies || [];
    this.guardrails = config.guardrails || [];
    this.cache = new LLMCache(config.cacheTTL);
    this.replayLog = new ReplayLog(config.logDir);
    this.policyStore = config.policyStore || new LlmPolicyStore();
    this.costTracker = config.costTracker || new CostTracker();
    this.abuseDetector = config.abuseDetector || new AbuseDetector();
  }

  private emitSecurity(event: SecurityEvent) {
    // Structured event for SIEM ingestion without external dependencies
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        kind: 'llm_security_event',
        ...event,
        ts: new Date().toISOString(),
      }),
    );
  }

  private recordRequest(tenantId: string, rpmLimit?: number): boolean {
    if (!rpmLimit) return true;
    const now = Date.now();
    const windowStart = now - 60_000;
    const existing = this.requestWindow.get(tenantId) || [];
    const recent = existing.filter((ts) => ts >= windowStart);
    recent.push(now);
    this.requestWindow.set(tenantId, recent);
    return recent.length <= rpmLimit;
  }

  private chooseClass(
    requested: ModelClass,
    taskModelClasses: Record<string, unknown>,
    softExceeded: boolean,
  ): { className: ModelClass; downgraded: boolean } | null {
    const available = Object.keys(taskModelClasses) as ModelClass[];
    if (!softExceeded && available.includes(requested)) {
      return { className: requested, downgraded: false };
    }
    if (!softExceeded && !available.length) {
      return null;
    }
    const targetIndex = CLASS_ORDER.indexOf(requested);
    const cheaper = CLASS_ORDER.filter((cls, idx) => idx <= targetIndex);
    const pick = cheaper.find((cls) => available.includes(cls)) || available[0];
    if (!pick) return null;
    return { className: pick, downgraded: pick !== requested };
  }

  private buildFailureResponse(
    fullRequest: LLMRequest,
    message: string,
    policyWarnings: string[],
    securityEvents: string[],
    started: number,
  ): LLMResponse {
    const duration = Date.now() - started;
    metrics.incrementCounter(
      'summit_llm_requests_total',
      { provider: 'none', model: 'none', status: 'denied', tenantId: fullRequest.tenantId },
      1,
    );
    return {
      id: randomUUID(),
      requestId: fullRequest.id,
      provider: 'other',
      model: 'denied',
      text: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
      latencyMs: duration,
      cached: false,
      ok: false,
      policyWarnings,
      securityEvents,
      error: message,
    };
  }

  async route(request: Partial<LLMRequest>): Promise<LLMResponse> {
    const started = Date.now();
    const warnings: string[] = [];
    const securityEvents: string[] = [];
    const abuseConfig: AbuseConfig = { ...DEFAULT_ABUSE_CONFIG };

    let fullRequest: LLMRequest = {
      id: request.id || randomUUID(),
      tenantId: request.tenantId || 'unknown',
      taskType: request.taskType || 'rag',
      modelClass: request.modelClass || 'balanced',
      sensitivity: request.sensitivity || 'medium',
      messages: request.messages || [],
      ...request,
    } as LLMRequest;

    // 1. Safety Guardrails (Pre-Processing)
    try {
      for (const guard of this.guardrails) {
        fullRequest = await guard.validateRequest(fullRequest);
      }
    } catch (err: any) {
      throw new SafetyViolationError('Pre-processing', err.message);
    }

    // 2. Policy lookup (deny-by-default)
    const scopedPolicy = this.policyStore.getClassPolicy(
      fullRequest.tenantId,
      fullRequest.taskType,
      fullRequest.modelClass,
    );
    if (!scopedPolicy) {
      return this.buildFailureResponse(
        fullRequest,
        'No matching LLM policy for tenant/task/model class',
        warnings,
        securityEvents,
        started,
      );
    }

    const { tenant, task } = scopedPolicy;
    if (tenant.promptLimit) {
      abuseConfig.promptLimit = tenant.promptLimit;
    }
    if (tenant.abuse?.failureThreshold) {
      abuseConfig.failureThreshold = tenant.abuse.failureThreshold;
    }
    if (tenant.abuse?.windowSeconds) {
      abuseConfig.windowSeconds = tenant.abuse.windowSeconds;
    }
    if (tenant.abuse?.suspiciousPatterns?.length) {
      abuseConfig.suspiciousPatterns = tenant.abuse.suspiciousPatterns;
    }

    // 3. Prompt and abuse guards
    const promptEvent = this.abuseDetector.checkPromptLimit(
      fullRequest.tenantId,
      fullRequest.messages,
      abuseConfig.promptLimit,
    );
    if (promptEvent) {
      this.emitSecurity(promptEvent);
      securityEvents.push(promptEvent.reason);
      return this.buildFailureResponse(fullRequest, promptEvent.reason, warnings, securityEvents, started);
    }

    const suspiciousEvent = this.abuseDetector.detectSuspicious(
      fullRequest.tenantId,
      fullRequest.messages,
      abuseConfig.suspiciousPatterns,
    );
    if (suspiciousEvent) {
      this.emitSecurity(suspiciousEvent);
      securityEvents.push(suspiciousEvent.reason);
    }

    const rpmLimit =
      scopedPolicy.classPolicy.maxRequestsPerMinute ||
      task.maxRequestsPerMinute ||
      tenant.maxRequestsPerMinute;
    const withinRateLimit = this.recordRequest(fullRequest.tenantId, rpmLimit);
    if (!withinRateLimit) {
      const reason = 'Per-minute LLM request limit exceeded';
      securityEvents.push(reason);
      this.emitSecurity({
        type: 'rate_limit',
        tenantId: fullRequest.tenantId,
        reason,
      });
      return this.buildFailureResponse(fullRequest, reason, warnings, securityEvents, started);
    }

    const tenantUsage = this.costTracker.getUsage(fullRequest.tenantId);
    if (tenantUsage && tenantUsage.costUsd >= tenant.monthlyCost.hard) {
      const reason = 'Tenant hard monthly LLM cost cap reached';
      return this.buildFailureResponse(fullRequest, reason, warnings, securityEvents, started);
    }
    const alreadySoftExceeded =
      tenantUsage && tenantUsage.costUsd >= tenant.monthlyCost.soft ? true : false;

    const requestedCosts: number[] = scopedPolicy.classPolicy.allowedModels
      .map((allowed) => {
        const provider = this.providers.get(allowed.provider);
        if (!provider) return Infinity;
        const reqWithModel = { ...fullRequest, model: allowed.model };
        return provider.estimateCost(reqWithModel);
      })
      .filter((c) => Number.isFinite(c));
    const projectedSoftExceeded =
      requestedCosts.length > 0
        ? this.costTracker.canSpend(
            fullRequest.tenantId,
            Math.min(...requestedCosts),
            tenant,
          ).softExceeded
        : false;
    const softPressure = alreadySoftExceeded || projectedSoftExceeded;

    // 4. Check cache
    const cacheKey = this.cache.generateKey(fullRequest);
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) {
      metrics.incrementCounter('summit_llm_requests_total', {
        provider: cachedResponse.provider,
        model: cachedResponse.model,
        status: 'cached',
        tenantId: fullRequest.tenantId,
      });
      await this.replayLog.log(fullRequest, cachedResponse);
      return cachedResponse;
    }

    // 5. Determine eligible providers/models based on policy
    const classChoice = this.chooseClass(
      fullRequest.modelClass,
      scopedPolicy.task.modelClasses as Record<string, unknown>,
      softPressure,
    );
    if (!classChoice) {
      return this.buildFailureResponse(
        fullRequest,
        'No eligible model classes for request',
        warnings,
        securityEvents,
        started,
      );
    }
    if (classChoice.downgraded || softPressure) {
      warnings.push('Soft cost cap reached: downgraded to cheaper class');
    }
    const effectiveClass = classChoice.className;
    const classPolicy = this.policyStore.getClassPolicy(
      fullRequest.tenantId,
      fullRequest.taskType,
      effectiveClass,
    );
    if (!classPolicy) {
      return this.buildFailureResponse(
        fullRequest,
        'No eligible models after applying policy',
        warnings,
        securityEvents,
        started,
      );
    }
    fullRequest = { ...fullRequest, modelClass: effectiveClass };

    const plans: Array<{ provider: ProviderAdapter; model: string }> = [];
    for (const allowed of classPolicy.classPolicy.allowedModels) {
      const provider = this.providers.get(allowed.provider);
      if (provider && provider.supports(allowed.model)) {
        plans.push({ provider, model: allowed.model });
      }
    }

    if (!plans.length) {
      return this.buildFailureResponse(
        fullRequest,
        'No providers available under policy',
        warnings,
        securityEvents,
        started,
      );
    }

    // Enforce token ceilings from policy
    const tokenLimit =
      classPolicy.classPolicy.maxTokens || classPolicy.task.maxTokens || tenant.promptLimit;
    if (tokenLimit) {
      const estimatedTokens =
        fullRequest.messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0) / 4 +
        (fullRequest.maxTokens || 0);
      if (estimatedTokens > tokenLimit) {
        const reason = `Request exceeds token limit of ${tokenLimit}`;
        return this.buildFailureResponse(fullRequest, reason, warnings, securityEvents, started);
      }
    }

    // Apply routing policies deterministically
    let providerOrder = plans.map((p) => p.provider);
    for (const policy of this.policies) {
      if (policy.sortProviders) {
        providerOrder = await policy.sortProviders(providerOrder, fullRequest);
      }
    }
    const orderedPlans = providerOrder
      .map((p) => plans.find((plan) => plan.provider === p))
      .filter((p): p is { provider: ProviderAdapter; model: string } => Boolean(p));

    // 6. Execute with fallback
    let lastError: Error | null = null;
    let finalResponse: LLMResponse | null = null;

    for (const plan of orderedPlans) {
      const requestWithModel = { ...fullRequest, model: plan.model };
      const spendCheck = this.costTracker.canSpend(
        fullRequest.tenantId,
        plan.provider.estimateCost(requestWithModel),
        tenant,
      );
      if (!spendCheck.allowed) {
        const reason = 'Request would exceed hard cost ceiling';
        return this.buildFailureResponse(requestWithModel, reason, warnings, securityEvents, started);
      }
      if (spendCheck.softExceeded && !warnings.includes('Soft cost cap reached: downgraded to cheaper class')) {
        warnings.push('Soft cost cap reached: monitoring spend and applying cheapest route');
      }

      try {
        const response = await plan.provider.generate(requestWithModel);
        finalResponse = {
          ...response,
          ok: true,
          policyWarnings: warnings,
          securityEvents,
        };
        this.costTracker.record(fullRequest.tenantId, requestWithModel, finalResponse, tenant);
        break; // Success
      } catch (error: any) {
        this.abuseDetector.recordFailure(
          fullRequest.tenantId,
          abuseConfig.windowSeconds || DEFAULT_ABUSE_CONFIG.windowSeconds!,
        );
        if (
          this.abuseDetector.exceededFailures(
            fullRequest.tenantId,
            abuseConfig.failureThreshold || DEFAULT_ABUSE_CONFIG.failureThreshold!,
            abuseConfig.windowSeconds || DEFAULT_ABUSE_CONFIG.windowSeconds!,
          )
        ) {
          const reason = 'Repeated LLM failures detected for tenant';
          securityEvents.push(reason);
          return this.buildFailureResponse(requestWithModel, reason, warnings, securityEvents, started);
        }

        lastError =
          error instanceof ProviderError ? error : new ProviderError(plan.provider.name, error.message, error);
      }
    }

    if (!finalResponse) {
      const failureResponse = this.buildFailureResponse(
        fullRequest,
        `All providers failed. Last error: ${lastError?.message}`,
        warnings,
        securityEvents,
        started,
      );
      await this.replayLog.log(fullRequest, failureResponse, lastError || undefined);
      return failureResponse;
    }

    // 7. Safety Guardrails (Post-Processing)
    try {
      for (const guard of this.guardrails) {
        finalResponse = await guard.validateResponse(finalResponse);
      }
    } catch (err: any) {
      throw new SafetyViolationError('Post-processing', err.message);
    }

    // 8. Cache & Log
    this.cache.set(cacheKey, finalResponse);
    await this.replayLog.log(fullRequest, finalResponse);
    metrics.incrementCounter('summit_llm_requests_total', {
      provider: finalResponse.provider,
      model: finalResponse.model,
      status: finalResponse.ok ? 'success' : 'failure',
      tenantId: fullRequest.tenantId,
    });
    metrics.observeHistogram(
      'summit_llm_latency_seconds',
      (Date.now() - started) / 1000,
      {
        provider: finalResponse.provider,
        model: finalResponse.model,
      },
    );
    metrics.incrementCounter(
      'summit_llm_tokens_total',
      { provider: finalResponse.provider, model: finalResponse.model, kind: 'prompt' },
      finalResponse.usage.promptTokens,
    );
    metrics.incrementCounter(
      'summit_llm_tokens_total',
      { provider: finalResponse.provider, model: finalResponse.model, kind: 'completion' },
      finalResponse.usage.completionTokens,
    );

    return finalResponse;
  }

  registerProvider(provider: ProviderAdapter) {
    this.providers.set(provider.name, provider);
  }
}
