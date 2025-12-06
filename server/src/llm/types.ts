export type ProviderType = 'openai' | 'anthropic' | 'groq' | 'openrouter' | 'mock';

export interface LLMRequest {
  id: string; // Unique request ID
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: string; // Specific model request, overrides routing
  tags?: string[]; // e.g., ['fast', 'code', 'reasoning']
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  tools?: any[]; // Tool definitions
  toolChoice?: any;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
  budget?: {
    maxCost?: number; // USD
    maxLatency?: number; // ms
  };
}

export interface LLMResponse {
  id: string;
  requestId: string;
  provider: ProviderType;
  model: string;
  text: string;
  toolCalls?: any[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number; // USD
  };
  latencyMs: number;
  cached: boolean;
  metadata?: Record<string, any>;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  models: string[];
  rpmLimit?: number;
}

export interface ModelCapability {
  name: string;
  contextWindow: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  avgLatencyMs?: number;
  tags: string[]; // ['fast', 'cheap', 'smart', 'vision']
}

export interface RoutingPolicy {
  name: string;
  /**
   * Sorts or filters providers based on the policy.
   * Returns a prioritized list of providers to try.
   */
  sortProviders(providers: ProviderAdapter[], request: LLMRequest): Promise<ProviderAdapter[]>;
}

export interface SafetyGuardrail {
    name: string;
    /**
     * Checks the request before sending it to the provider.
     * Throws an error or returns modified request.
     */
    validateRequest(request: LLMRequest): Promise<LLMRequest>;

    /**
     * Checks the response before returning it to the user.
     * Throws an error or returns modified response (e.g., redacted).
     */
    validateResponse(response: LLMResponse): Promise<LLMResponse>;
}

export interface ProviderAdapter {
  name: ProviderType;
  isHealthy(): boolean;
  supports(model: string): boolean;
  estimateCost(request: LLMRequest): number;
  generate(request: LLMRequest): Promise<LLMResponse>;
  getCapabilities(): ModelCapability[];
}
