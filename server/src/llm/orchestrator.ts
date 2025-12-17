
import {
    LlmOrchestrator,
    ChatCompletionRequest,
    ChatCompletionResult,
    LlmProvider,
    RoutingPolicy
} from './types';
import { DefaultRoutingPolicy } from './router/default-policy';
import { MockProvider } from './providers/mock-provider';
import { OpenAiProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import { safetyPipeline } from './safety/pipeline';
import { llmMeteringService } from './metering/service';

export class SummitLlmOrchestrator implements LlmOrchestrator {
    private providers: Map<string, LlmProvider> = new Map();
    private routingPolicy: RoutingPolicy;

    constructor(
        routingPolicy?: RoutingPolicy,
        providers?: LlmProvider[]
    ) {
        this.routingPolicy = routingPolicy || new DefaultRoutingPolicy();

        const defaultProviders = [
            new MockProvider(),
            new OpenAiProvider(),
            new AnthropicProvider()
        ];

        (providers || defaultProviders).forEach(p => {
            this.providers.set(p.id, p);
        });
    }

    async chat(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
        // 1. Safety Pre-check
        await safetyPipeline.preCheck(request);

        // 2. Route
        const inputTokens = this.estimateTokens(request.messages);

        // Metering Pre-check
        const withinQuota = await llmMeteringService.checkQuota(request.tenantId, inputTokens);
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

        // 4. Execute
        const result = await provider.chat({
            ...request,
            model: decision.model
        });

        // 5. Safety Post-check
        await safetyPipeline.postCheck(request, result);

        // 6. Record Usage
        if (result.usage) {
             await llmMeteringService.recordUsage(
                 request.tenantId,
                 result.provider,
                 result.model,
                 {
                     input: result.usage.inputTokens,
                     output: result.usage.outputTokens,
                     cost: result.usage.costUsd || 0
                 }
             );
        }

        return result;
    }

    private estimateTokens(messages: any[]): number {
        // Rough estimate: 1 token ~= 4 chars
        const text = messages.map(m => m.content).join(' ');
        return Math.ceil(text.length / 4);
    }
}
