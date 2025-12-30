
import {
    LLMProvider,
    LLMRequest,
    LLMResult,
    LLMRouterConfig,
    RoutingPolicy,
    SafetyGuardrail
} from './interfaces.js';
import { Observability, ConsoleObservability } from './observability.js';
import { OpenAIProvider } from './providers/OpenAIProvider.js';
import { AnthropicProvider } from './providers/AnthropicProvider.js';
import { MockProvider } from './providers/MockProvider.js';
import { CostControlPolicy } from './policies/CostControlPolicy.js';
import { LatencyPolicy } from './policies/LatencyPolicy.js';
import { PIIGuardrail } from './guardrails/PIIGuardrail.js';

export class LLMRouter {
    private providers: Map<string, LLMProvider> = new Map();
    private policies: Map<string, RoutingPolicy> = new Map();
    private guardrails: SafetyGuardrail[] = [];
    private config: LLMRouterConfig;
    private observability: Observability;

    constructor(config: LLMRouterConfig, observability?: Observability) {
        this.config = config;
        this.observability = observability || new ConsoleObservability();

        this.initializeProviders();
        this.initializePolicies();
        this.initializeGuardrails();
    }

    private initializeProviders() {
        // Instantiate providers based on config
        for (const pConfig of this.config.providers) {
            let provider: LLMProvider | null = null;
            if (pConfig.type === 'openai') {
                provider = new OpenAIProvider();
            } else if (pConfig.type === 'anthropic') {
                provider = new AnthropicProvider();
            } else if (pConfig.type === 'mock') {
                provider = new MockProvider();
            }

            if (provider) {
                // If name in config differs from class default, we might wrap or set it
                // For now, we index by the config name
                this.providers.set(pConfig.name, provider);
            }
        }
    }

    private initializePolicies() {
        this.policies.set('cost-control', new CostControlPolicy());
        this.policies.set('latency', new LatencyPolicy());
    }

    private initializeGuardrails() {
        this.guardrails.push(new PIIGuardrail());
    }

    public async execute(request: LLMRequest): Promise<LLMResult> {
        const startTime = Date.now();
        let currentRequest = { ...request };

        try {
            // 1. Pre-process guardrails
            for (const guardrail of this.guardrails) {
                currentRequest = await guardrail.preProcess(currentRequest);
            }

            // 2. Select Provider
            const policyName = this.config.routing?.overrides?.[currentRequest.taskType]
                || this.config.routing?.defaultPolicy
                || 'cost-control';

            const policy = this.policies.get(policyName);
            if (!policy) {
                throw new Error(`Policy ${policyName} not found`);
            }

            // Filter candidates that support the task and are configured
            const candidates: LLMProvider[] = [];
            for (const pConfig of this.config.providers) {
                const provider = this.providers.get(pConfig.name);
                if (provider && provider.supports(currentRequest.taskType)) {
                    candidates.push(provider);
                }
            }

            if (candidates.length === 0) {
                 throw new Error(`No providers found for task type: ${currentRequest.taskType}`);
            }

            const selectedProvider = policy.selectProvider(candidates, currentRequest, this.config);

            if (!selectedProvider) {
                throw new Error('Policy returned no provider');
            }

            const providerConfig = this.config.providers.find(p => p.name === selectedProvider.name);

            // 3. Execute
            let result = await selectedProvider.call(currentRequest, providerConfig);

            // 4. Post-process guardrails
            for (const guardrail of this.guardrails) {
                result = await guardrail.postProcess(currentRequest, result);
            }

            const duration = Date.now() - startTime;

            // Update cost tracker if applicable (simulated)
            if (result.ok && policyName === 'cost-control') {
                 const est = selectedProvider.estimate(currentRequest.taskType, result.usage?.total_tokens || 0);
                 CostControlPolicy.trackUsage(est.costUsd, currentRequest.tenantId);
            }

            this.observability.logLLMCall(currentRequest, result, duration);
            this.observability.recordMetric('llm_call_count', 1, {
                provider: selectedProvider.name,
                model: result.model || 'unknown',
                status: result.ok ? 'success' : 'failure'
            });

            return result;

        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorResult = {
                ok: false,
                error: error.message
            };
            this.observability.logLLMCall(currentRequest, errorResult, duration);
            this.observability.recordMetric('llm_call_error', 1, {
                taskType: currentRequest.taskType
            });
            return errorResult;
        }
    }
}
