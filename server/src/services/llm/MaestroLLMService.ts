
import { LLMRouter } from './LLMRouter.js';
import { llmRouterConfig } from '../../config/llm-router.config.js';
import { LLMRequest, LLMResult } from './interfaces.js';
import { AgentTurn, AgentContextManager } from '@intelgraph/agent-context';
import { agentContextDefaults, buildAgentContextManager } from '../../config/agent-context.config.js';

export class MaestroLLMService {
    private router: LLMRouter;
    private static instance: MaestroLLMService;
    private contextManager: AgentContextManager;

    private constructor() {
        this.router = new LLMRouter(llmRouterConfig);
        this.contextManager = buildAgentContextManager();
    }

    public static getInstance(): MaestroLLMService {
        if (!MaestroLLMService.instance) {
            MaestroLLMService.instance = new MaestroLLMService();
        }
        return MaestroLLMService.instance;
    }

    public async executeTaskLLM(params: {
        taskType: string;
        prompt?: string;
        messages?: Array<{ role: string; content: string }>;
        context?: Record<string, any>;
        runId?: string;
        tenantId?: string;
        metadata?: Record<string, any>;
        turn?: AgentTurn;
        strategyOverride?: 'masking' | 'summarization' | 'hybrid' | 'raw';
        tokenBudget?: number;
    }): Promise<LLMResult> {
        if (params.turn) {
            await this.contextManager.ingestTurn({ ...params.turn });
        }

        const promptContext = await this.contextManager.buildPromptContext({
            tokenBudget: params.tokenBudget || agentContextDefaults.tokenBudget,
            reservedForResponse: agentContextDefaults.reservedForResponse,
            maxContextPct: agentContextDefaults.maxContextPct,
            strategy: params.strategyOverride || agentContextDefaults.strategy,
            maskingWindow: agentContextDefaults.maskingWindow,
            summarizationTurnThreshold: agentContextDefaults.summarizationTurnThreshold,
            summarizationTokenThreshold: agentContextDefaults.summarizationTokenThreshold,
            maxTurns: agentContextDefaults.maxTurns,
            maxCostUsd: agentContextDefaults.maxCostUsd,
            plateauWindow: agentContextDefaults.plateauWindow,
        });

        const request: LLMRequest = {
            taskType: params.taskType,
            prompt: params.prompt,
            messages: params.messages || promptContext.messages,
            context: params.context,
            runId: params.runId,
            tenantId: params.tenantId,
            metadata: params.metadata
        };

        if (promptContext.diagnostics) {
            // eslint-disable-next-line no-console
            console.log('[agent-context] diagnostics', {
                taskType: params.taskType,
                agentContext: promptContext.diagnostics,
            });
        }

        return this.router.execute(request);
    }
}
