export type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

export interface LLMClient {
  complete(input: { modelId: string; messages: LLMMessage[]; maxTokens?: number }): Promise<{ text: string }>;
}

export type DebateResult = {
  draft: string;
  critique: string;
  revised: string;
  judged?: { pass: boolean; notes: string };
};
