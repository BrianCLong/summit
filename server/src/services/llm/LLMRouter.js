"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMRouter = void 0;
const observability_js_1 = require("./observability.js");
const OpenAIProvider_js_1 = require("./providers/OpenAIProvider.js");
const AnthropicProvider_js_1 = require("./providers/AnthropicProvider.js");
const MockProvider_js_1 = require("./providers/MockProvider.js");
const CostControlPolicy_js_1 = require("./policies/CostControlPolicy.js");
const LatencyPolicy_js_1 = require("./policies/LatencyPolicy.js");
const PIIGuardrail_js_1 = require("./guardrails/PIIGuardrail.js");
class LLMRouter {
    providers = new Map();
    policies = new Map();
    guardrails = [];
    config;
    observability;
    constructor(config, observability) {
        this.config = config;
        this.observability = observability || new observability_js_1.ConsoleObservability();
        this.initializeProviders();
        this.initializePolicies();
        this.initializeGuardrails();
    }
    initializeProviders() {
        // Instantiate providers based on config
        for (const pConfig of this.config.providers) {
            let provider = null;
            if (pConfig.type === 'openai') {
                provider = new OpenAIProvider_js_1.OpenAIProvider();
            }
            else if (pConfig.type === 'anthropic') {
                provider = new AnthropicProvider_js_1.AnthropicProvider();
            }
            else if (pConfig.type === 'mock') {
                provider = new MockProvider_js_1.MockProvider();
            }
            if (provider) {
                // If name in config differs from class default, we might wrap or set it
                // For now, we index by the config name
                this.providers.set(pConfig.name, provider);
            }
        }
    }
    initializePolicies() {
        this.policies.set('cost-control', new CostControlPolicy_js_1.CostControlPolicy());
        this.policies.set('latency', new LatencyPolicy_js_1.LatencyPolicy());
    }
    initializeGuardrails() {
        this.guardrails.push(new PIIGuardrail_js_1.PIIGuardrail());
    }
    async execute(request) {
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
            const candidates = [];
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
                CostControlPolicy_js_1.CostControlPolicy.trackUsage(est.costUsd, currentRequest.tenantId);
            }
            this.observability.logLLMCall(currentRequest, result, duration);
            this.observability.recordMetric('llm_call_count', 1, {
                provider: selectedProvider.name,
                model: result.model || 'unknown',
                status: result.ok ? 'success' : 'failure'
            });
            return result;
        }
        catch (error) {
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
exports.LLMRouter = LLMRouter;
