
import { LLMRouter } from './LLMRouter.js';
import { llmRouterConfig } from '../../config/llm-router.config.js';
import { LLMRequest, LLMResult } from './interfaces.js';

export class MaestroLLMService {
    private router: LLMRouter;
    private static instance: MaestroLLMService;

    private constructor() {
        this.router = new LLMRouter(llmRouterConfig);
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
    }): Promise<LLMResult> {
        const request: LLMRequest = {
            taskType: params.taskType,
            prompt: params.prompt,
            messages: params.messages,
            context: params.context,
            runId: params.runId,
            tenantId: params.tenantId,
            metadata: params.metadata
        };

        return this.router.execute(request);
    }
}
