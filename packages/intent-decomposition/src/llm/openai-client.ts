export interface ChatCompletionOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
}

export class OpenAICompatibleClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async complete(prompt: string, options: ChatCompletionOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: options.model,
        temperature: options.temperature ?? 0,
        max_tokens: options.maxTokens ?? 512,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM response missing content');
    }
    return content;
  }
}
