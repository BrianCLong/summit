
export type ProviderId = 'openai' | 'anthropic' | 'mock' | 'groq' | 'openrouter' | 'other';
export type ModelId = string;
export type Role = 'system' | 'user' | 'assistant' | 'tool';
export type ModelClass = 'fast' | 'balanced' | 'premium' | 'cheap';
export type TaskType = 'rag' | 'summarization' | 'extraction' | 'agent';
export type SensitivityLevel = 'low' | 'medium' | 'high';

export interface ToolCallInvocation {
  toolName: string;
  args: Record<string, unknown>;
  id: string;
}

export interface ChatMessage {
  role: Role;
  content: string | null;
  name?: string;
  toolCalls?: ToolCallInvocation[];
  toolCallId?: string; // For role: 'tool'
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ChatCompletionRequest {
  tenantId: string;
  purpose: 'rag_answer' | 'summarization' | 'classification' | 'agent' | 'tool_call' | 'other';
  riskLevel: 'low' | 'medium' | 'high';
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  maxCostUsd?: number;
  timeoutMs?: number;
  correlationId?: string;
  // Provider agnostic hints
  temperature?: number;
  jsonMode?: boolean;
}

export interface ChatCompletionResult {
  provider: ProviderId;
  model: ModelId;
  content: string | null;
  toolCalls?: ToolCallInvocation[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd?: number;
  };
  raw?: unknown;
}

export interface LlmProvider {
  id: ProviderId;
  supports(model: ModelId, capabilities?: string[]): boolean;
  chat(request: ChatCompletionRequest & { model: ModelId }): Promise<ChatCompletionResult>;
}

export interface RoutingContext {
  tenantId: string;
  purpose: ChatCompletionRequest['purpose'];
  riskLevel: ChatCompletionRequest['riskLevel'];
  inputTokenEstimate: number;
  maxCostUsd?: number;
  timeoutMs?: number;
}

export interface RoutingDecision {
  provider: ProviderId;
  model: ModelId;
  reason?: string;
}

export interface RoutingPolicy {
  name: string;
  chooseModel?(ctx: RoutingContext): RoutingDecision;
  sortProviders?(providers: ProviderAdapter[], request: LLMRequest): Promise<ProviderAdapter[]>;
}

export interface LlmOrchestrator {
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
}

export interface ModelCapability {
  name: ModelId;
  class: ModelClass;
  contextWindow: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  tags: string[];
  avgLatencyMs?: number;
  maxPromptChars?: number;
}

export interface RequestBudget {
  maxCost?: number;
  maxTokens?: number;
}

export interface LLMRequest {
  id: string;
  tenantId: string;
  taskType: TaskType;
  modelClass: ModelClass;
  sensitivity: SensitivityLevel;
  messages: ChatMessage[];
  model?: string;
  tags?: string[];
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  toolChoice?: string;
  budget?: RequestBudget;
  metadata?: Record<string, unknown>;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface LLMResponse {
  id: string;
  requestId: string;
  provider: ProviderId;
  model: ModelId;
  text: string;
  usage: LLMUsage;
  latencyMs: number;
  cached: boolean;
  ok?: boolean;
  policyWarnings?: string[];
  securityEvents?: string[];
  error?: string;
}

export interface ProviderAdapter {
  name: ProviderId;
  generate(request: LLMRequest): Promise<LLMResponse>;
  estimateCost(request: LLMRequest): number;
  supports(model: ModelId): boolean;
  getCapabilities(): ModelCapability[];
}

export interface SafetyGuardrail {
  name: string;
  validateRequest(request: LLMRequest): Promise<LLMRequest>;
  validateResponse(response: LLMResponse): Promise<LLMResponse>;
}

export interface AdvancedRoutingPolicy {
  name: string;
  sortProviders(providers: ProviderAdapter[], request: LLMRequest): Promise<ProviderAdapter[]>;
}
