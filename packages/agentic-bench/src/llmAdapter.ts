import fs from 'fs';
import path from 'path';
import process from 'process';
import { pathToFileURL } from 'url';
interface LLMRequest {
  taskType: string;
  messages: ChatMessage[];
  tenantId?: string;
}

interface LLMResult {
  ok: boolean;
  text?: string;
  error?: string;
  model?: string;
  usage?: { total_tokens?: number };
}

interface LLMRouterConfig {
  providers: Array<{ name: string; type: string }>;
  routing?: { defaultPolicy?: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMClient {
  complete(messages: ChatMessage[], taskType: string): Promise<string>;
}

type LLMRouterConstructor = new (
  config: LLMRouterConfig,
) => { execute(request: LLMRequest): Promise<LLMResult> };

interface LLMRouterDependencies {
  LLMRouter: LLMRouterConstructor;
  config: LLMRouterConfig;
}

function resolveRepoPath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

function ensureModulePath(relativePath: string): string {
  const fullPath = resolveRepoPath(relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing dependency at ${relativePath}`);
  }
  return fullPath;
}

async function loadRouterDependencies(): Promise<LLMRouterDependencies> {
  const routerPath = ensureModulePath('server/src/services/llm/LLMRouter.ts');
  const configPath = ensureModulePath('server/src/config/llm-router.config.ts');
  const routerModule = await import(pathToFileURL(routerPath).href);
  const configModule = await import(pathToFileURL(configPath).href);
  return {
    LLMRouter: routerModule.LLMRouter as LLMRouterConstructor,
    config: configModule.llmRouterConfig as LLMRouterConfig,
  };
}

export class LLMRouterClient implements LLMClient {
  private routerPromise: Promise<{ execute(request: LLMRequest): Promise<LLMResult> }>;

  constructor(useMockOnly = true) {
    this.routerPromise = loadRouterDependencies().then((deps) => {
      const config = useMockOnly
        ? {
            ...deps.config,
            providers: deps.config.providers.filter((p) => p.type === 'mock'),
            routing: { defaultPolicy: 'cost-control' },
          }
        : deps.config;
      return new deps.LLMRouter(config);
    });
  }

  async complete(messages: ChatMessage[], taskType: string): Promise<string> {
    const router = await this.routerPromise;
    const request: LLMRequest = {
      taskType,
      messages,
    };
    const result = await router.execute(request);
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
        call_id: 'mock-1',
      },
    ];
    return JSON.stringify({
      plan,
      reflection,
      tool_calls: toolCalls,
      final_answer: lastUser?.content ?? '',
    });
  }
}
