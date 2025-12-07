
export interface LLMRequest {
  taskType: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  context?: Record<string, any>;
  runId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export interface LLMResult {
  ok: boolean;
  text?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
  provider?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ProviderConfig {
  name: string;
  type: string; // 'openai', 'anthropic', 'mock', etc.
  apiKeyEnv: string;
  baseUrl?: string;
  models: Record<string, string>; // Maps taskType/tag to model ID
  costPerMs?: number;
  default?: boolean;
}

export interface LLMProvider {
  name: string;
  supports(taskType: string): boolean;
  estimate(taskType: string, inputTokens: number): { costUsd: number; p95ms: number };
  call(request: LLMRequest, config?: ProviderConfig): Promise<LLMResult>;
}

export interface RoutingPolicy {
  name: string;
  selectProvider(
    candidates: LLMProvider[],
    request: LLMRequest,
    config: LLMRouterConfig
  ): LLMProvider | null;
}

export interface SafetyGuardrail {
  name: string;
  preProcess(request: LLMRequest): Promise<LLMRequest>;
  postProcess(request: LLMRequest, result: LLMResult): Promise<LLMResult>;
}

export interface LLMRouterConfig {
  providers: ProviderConfig[];
  routing?: {
    defaultPolicy: string;
    overrides?: Record<string, string>; // taskType -> policyName
  };
  budgets?: {
    globalDailyUsd?: number;
    perTenantDailyUsd?: Record<string, number>;
  };
}
