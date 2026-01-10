
import type { PaletteCandidateSet, PaletteRequestOptions, PaletteUsageRecord } from './palette/types.js';

export type ProviderId = "openai" | "anthropic" | "mock" | "groq" | "openrouter" | "other";
export type ModelId = string;
export type Role = "system" | "user" | "assistant" | "tool";
export type ModelClass = "smart" | "fast" | "balanced" | "vision" | "embedding";
export type SensitivityLevel = "low" | "medium" | "high" | "critical";
export type TaskType = "rag_answer" | "summarization" | "classification" | "agent" | "tool_call" | "embedding" | "other";

export type RecommendedAction = "allow" | "allow_with_strict_mode" | "require_step_up" | "block";

export interface PromptInjectionFinding {
  source: "user" | "retrieval";
  score: number;
  matchedRules: string[];
  recommendedAction: RecommendedAction;
  snippet?: string;
}

export interface SecurityContext {
  promptFindings: PromptInjectionFinding[];
  strictMode: boolean;
  disabledTools: string[];
  stepUpRequired?: boolean;
  stepUpVerified?: boolean;
}

export interface RetrievedChunk {
  text: string;
  docId: string;
  score?: number;
  metadata?: Record<string, unknown>;
  quarantined?: boolean;
  finding?: PromptInjectionFinding;
}

export interface ToolPermissionDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  minPrivilege: SensitivityLevel;
  allowedRoutes: string[];
  allowedRoles: string[];
  stepUpRequired?: boolean;
  highRisk?: boolean;
}

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
  name: string;
  chooseModel?(ctx: RoutingContext): RoutingDecision;
  sortProviders(providers: ProviderAdapter[], request: LLMRequest): Promise<ProviderAdapter[]>;
}

export interface LlmOrchestrator {
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
}

// Legacy types for router compatibility
export type ProviderType = ProviderId;

export interface Message {
  role: Role;
  content: string;
}

export interface LLMRequest {
  id: string;
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tenantId?: string;
  userId?: string;
  userRoles?: string[];
  route?: string;
  tags?: string[];
  budget?: {
    maxCost?: number;
  };
  tools?: unknown;
  toolChoice?: unknown;
  palette?: PaletteRequestOptions;
  securityContext?: SecurityContext;
  retrievalContext?: { chunks: RetrievedChunk[] };
}

export interface LLMResponse {
  id: string;
  requestId: string;
  provider: ProviderType;
  model: string;
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  latencyMs: number;
  cached: boolean;
  toolCalls?: unknown;
  paletteUsage?: PaletteUsageRecord;
  paletteCandidates?: PaletteCandidateSet[];
  selectedCandidateIndex?: number;
  paletteVerifierScores?: Array<number | null>;
}

export interface ModelCapability {
  name: string;
  tags: string[];
  inputCostPer1k: number;
  outputCostPer1k: number;
  avgLatencyMs?: number;
  contextWindow?: number;
}

export interface ProviderAdapter {
  name: ProviderType;
  isHealthy(): boolean;
  supports(model: string): boolean;
  estimateCost(request: LLMRequest): number;
  getCapabilities(): ModelCapability[];
  generate(request: LLMRequest): Promise<LLMResponse>;
}

export interface SafetyGuardrail {
  name: string;
  validateRequest(request: LLMRequest): Promise<LLMRequest>;
  validateResponse(response: LLMResponse): Promise<LLMResponse>;
}
