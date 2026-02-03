export type ModelProvider = "anthropic" | "openai" | "other";

export interface ModelRoute {
  provider: ModelProvider;
  model: string;
  fallback?: ModelRoute[];
}

export interface CostEstimate {
  maxUsd: number;
}

export interface ModelRouter {
  estimate(input: { route: ModelRoute; promptTokens: number; maxOutputTokens: number }): Promise<CostEstimate>;
  call(input: { route: ModelRoute; prompt: string }): Promise<{ text: string }>;
}
