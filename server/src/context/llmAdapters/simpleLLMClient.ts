import { LLMClient } from "../hybridContextManager.js";

export class SimpleLLMClient implements LLMClient {
  constructor(private readonly callLLM: (prompt: string) => Promise<string>) {}

  async summarize(text: string, systemPrompt: string): Promise<string> {
    const prompt = `${systemPrompt}\n\n---\n\n${text}`;
    return this.callLLM(prompt);
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
