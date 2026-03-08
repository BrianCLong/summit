"use strict";
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitLlmOrchestrator = void 0;
const default_policy_js_1 = require("./router/default-policy.js");
const mock_provider_js_1 = require("./providers/mock-provider.js");
const openai_provider_js_1 = require("./providers/openai-provider.js");
const anthropic_provider_js_1 = require("./providers/anthropic-provider.js");
const pipeline_js_1 = require("./safety/pipeline.js");
const service_js_1 = require("./metering/service.js");
class SummitLlmOrchestrator {
    providers = new Map();
    routingPolicy;
    constructor(routingPolicy, providers) {
        this.routingPolicy = routingPolicy || new default_policy_js_1.DefaultRoutingPolicy();
        const defaultProviders = [
            new mock_provider_js_1.MockProvider(),
            new openai_provider_js_1.OpenAiProvider(),
            new anthropic_provider_js_1.AnthropicProvider()
        ];
        (providers || defaultProviders).forEach(p => {
            this.providers.set(p.id, p);
        });
    }
    async chat(request) {
        // 1. Safety Pre-check
        await pipeline_js_1.safetyPipeline.preCheck(request);
        // 2. Route
        const inputTokens = this.estimateTokens(request.messages);
        // Metering Pre-check
        const withinQuota = await service_js_1.llmMeteringService.checkQuota(request.tenantId, inputTokens);
        if (!withinQuota) {
            throw new Error(`Quota exceeded for tenant ${request.tenantId}`);
        }
        const decision = this.routingPolicy.chooseModel({
            tenantId: request.tenantId,
            purpose: request.purpose,
            riskLevel: request.riskLevel,
            inputTokenEstimate: inputTokens,
            maxCostUsd: request.maxCostUsd,
            timeoutMs: request.timeoutMs
        });
        // 3. Select Provider
        const provider = this.providers.get(decision.provider);
        if (!provider) {
            throw new Error(`Routing selected unknown provider: ${decision.provider}`);
        }
        console.log(`[LLM] Routing ${request.purpose} (Risk: ${request.riskLevel}) to ${decision.provider}/${decision.model} because: ${decision.reason}`);
        // Innovation: Mode-aware routing for NVIDIA NIM
        if (decision.provider === 'nvidia-nim') {
            const isHardPrompt = request.purpose === 'agent' || request.purpose === 'tool_call' || inputTokens > 4000;
            request.mode = isHardPrompt ? 'thinking' : 'instant';
        }
        // 4. Execute
        const result = await provider.chat({
            ...request,
            model: decision.model
        });
        // 5. Safety Post-check
        await pipeline_js_1.safetyPipeline.postCheck(request, result);
        // 6. Record Usage
        if (result.usage) {
            await service_js_1.llmMeteringService.recordUsage(request.tenantId, result.provider, result.model, {
                input: result.usage.inputTokens,
                output: result.usage.outputTokens,
                cost: result.usage.costUsd || 0
            });
        }
        return result;
    }
    estimateTokens(messages) {
        // Rough estimate: 1 token ~= 4 chars
        const text = messages.map(m => m.content).join(' ');
        return Math.ceil(text.length / 4);
    }
}
exports.SummitLlmOrchestrator = SummitLlmOrchestrator;
