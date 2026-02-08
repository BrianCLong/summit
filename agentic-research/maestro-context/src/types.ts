export type Role = "user" | "assistant" | "tool";

export interface Turn {
  role: Role;
  content: string;
  observation?: string;
  action?: string;
  reasoning?: string;
  ts?: string; // ISO
}

export interface AgentContext {
  turns: Turn[];
  summary?: string;
  meta?: Record<string, unknown>;
}

export interface HybridContextOptions {
  observationWindow: number;         // keep last N turns unmasked
  summarizationInterval: number;      // every N turns (0 disables)
  placeholderStyle?: "compact" | "verbose";
  maxSummaryChars?: number;
}

export interface LLMClient {
  summarize(input: string): Promise<string>;
  estimateTokens(input: string): number;
}

export interface ContextMetrics {
  originalTokenEstimate: number;
  managedTokenEstimate: number;
  estimatedCostReduction: number; // 0..1
  maskedTurns: number;
  summarized: boolean;
}
