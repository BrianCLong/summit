import type { ChatMessage, ChatProvider, ChatResult } from './providerTypes';

type LocalLmStudioConfig = {
  baseUrl: string;
  apiKey?: string;
};

type ChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export class LocalLmStudioProvider implements ChatProvider {
  public readonly name = 'local-lmstudio';

  constructor(private readonly cfg: LocalLmStudioConfig) {}

  async chat(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): Promise<ChatResult> {
    const url = `${this.cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.cfg.apiKey ? { authorization: `Bearer ${this.cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.2,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`LMStudio provider error: ${res.status} ${detail}`);
    }

    const json = (await res.json()) as ChatCompletionsResponse;
    const text = json?.choices?.[0]?.message?.content ?? '';
    return { text, raw: json };
  }
}
