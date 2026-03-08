import { LLMRouter } from './router.js';
import { OpenAIProvider } from './providers/openai.js';
import { MockProvider } from './providers/mock.js';
import { NvidiaNimProvider } from './providers/nvidia-nim.js';
import { CostControlPolicy, LatencyPolicy } from './policies/index.js';
import { PIIGuardrail } from './safety.js';
import { defaultConfig, LLMRouterConfig } from './config.js';
import { ProviderAdapter, RoutingPolicy, SafetyGuardrail } from './types.js';

export function createLLMRouter(config: LLMRouterConfig = defaultConfig): LLMRouter {
    const providers: ProviderAdapter[] = [];

    if (config.providers.mock.enabled) {
        providers.push(new MockProvider());
    }

    if (config.providers.openai.enabled && config.providers.openai.apiKey) {
        providers.push(new OpenAIProvider(config.providers.openai.apiKey));
    }

    if (config.providers.nvidiaNim.enabled && config.providers.nvidiaNim.apiKey) {
        providers.push(new NvidiaNimProvider({
            apiKey: config.providers.nvidiaNim.apiKey,
            baseUrl: config.providers.nvidiaNim.baseUrl,
            model: config.providers.nvidiaNim.model,
            modeDefault: config.providers.nvidiaNim.modeDefault,
            enableMultimodal: config.providers.nvidiaNim.enableMultimodal
        }));
    }

    const policies: RoutingPolicy[] = [];
    if (config.policies.costControl.enabled) {
        policies.push(new CostControlPolicy(config.policies.costControl.maxCostPerRequest));
    }
    if (config.policies.latencyOptimization.enabled) {
        policies.push(new LatencyPolicy());
    }

    const guardrails: SafetyGuardrail[] = [];
    if (config.guardrails.piiRedaction.enabled) {
        guardrails.push(new PIIGuardrail());
    }

    return new LLMRouter({
        providers,
        policies,
        guardrails,
        cacheTTL: config.cache.enabled ? config.cache.ttlMs : 0,
        logDir: config.logging.enabled ? config.logging.logDir : undefined
    });
}

// Default instance
export const llmRouter = createLLMRouter();

export * from './types.js';
export * from './router.js';
export * from './errors.js';
export * from './config.js';
