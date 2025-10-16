export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};
export type ChatOptions = {
  stream?: boolean;
  tools?: any[];
  schema?: any;
  budgetUSD?: number;
};

export class OpenAIAdapter {
  constructor(
    private apiKey: string,
    private baseUrl?: string,
  ) {}
  async chat(messages: ChatMessage[], opts: ChatOptions = {}) {
    // Scaffold: integrate provider SDK here; respect opts.schema/tools/stream.
    return {
      id: `mock-${Date.now()}`,
      content: 'OK',
      usage: { tokens: 0, costUSD: 0 },
    };
  }
}
