// @ts-nocheck
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function require(name: string): any;
type LLMRequest = any;

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMClient {
    complete(messages: ChatMessage[], taskType: string): Promise<string>;
}

type LLMRouterType = any;

function loadRouterDependencies(): { LLMRouter: LLMRouterType; config: any } | null {
    try {
        const { LLMRouter } = require('../../server/src/services/llm/LLMRouter.js');
        const { llmRouterConfig } = require('../../server/src/config/llm-router.config.js');
        return { LLMRouter, config: llmRouterConfig };
    } catch (error) {
        return null;
    }
}

export class LLMRouterClient implements LLMClient {
    private router: LLMRouterType;

    constructor(useMockOnly = true) {
        const deps = loadRouterDependencies();
        if (!deps) {
            throw new Error('LLMRouter dependencies are unavailable in this environment');
        }
        const config = useMockOnly
            ? {
                  ...deps.config,
                  providers: deps.config.providers.filter((p: any) => p.type === 'mock'),
                  routing: { defaultPolicy: 'cost-control' }
              }
            : deps.config;
        this.router = new deps.LLMRouter(config);
    }

    async complete(messages: ChatMessage[], taskType: string): Promise<string> {
        const request: LLMRequest = {
            taskType,
            messages
        };
        const result = await this.router.execute(request);
        if (!result.ok) {
            throw new Error(result.error || 'LLMRouter returned failure');
        }
        return result.text || '';
    }
}

export class MockLLMClient implements LLMClient {
    async complete(messages: ChatMessage[], taskType: string): Promise<string> {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        const plan = `Plan: break ${taskType} task into 2 steps`;
        const reflection = 'Reflection: validated approach.';
        const toolCalls = [
            {
                name: 'planner',
                arguments: { note: 'mock call' },
                call_id: 'mock-1'
            }
        ];
        return JSON.stringify({ plan, reflection, tool_calls: toolCalls, final_answer: lastUser?.content ?? '' });
    }
}
