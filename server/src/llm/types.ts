
export type ProviderId = "openai" | "anthropic" | "mock" | "groq" | "openrouter" | "other";
export type ModelId = string;
export type Role = "system" | "user" | "assistant" | "tool";

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
  purpose: "rag_answer" | "summarization" | "classification" | "agent" | "tool_call" | "other";
  riskLevel: "low" | "medium" | "high";
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
  purpose: ChatCompletionRequest["purpose"];
  riskLevel: ChatCompletionRequest["riskLevel"];
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
  chooseModel(ctx: RoutingContext): RoutingDecision;
}

export interface LlmOrchestrator {
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
}
