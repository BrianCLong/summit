import { BaseProvider } from './base.js';
import type { LLMRequest, LLMResponse, ProviderType, ModelCapability, MultiModalPart } from '../types.js';
import { redactSecrets } from '../safety/log_redaction.js';

export class NvidiaNimProvider extends BaseProvider {
  name: ProviderType = 'nvidia_nim';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private modeDefault: 'instant' | 'thinking';
  private enableMultimodal: boolean;

  constructor(config: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    modeDefault?: 'instant' | 'thinking';
    enableMultimodal?: boolean;
  }) {
    super();
    this.apiKey = config.apiKey || process.env.NVIDIA_NIM_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://integrate.api.nvidia.com/v1';
    this.defaultModel = config.model || 'moonshotai/kimi-k2.5';
    this.modeDefault = config.modeDefault || 'instant';
    this.enableMultimodal = config.enableMultimodal || false;
    this.capabilities = [
      {
        name: this.defaultModel,
        tags: ['chat'],
        inputCostPer1k: 0,
        outputCostPer1k: 0,
      },
    ];
  }

  private serializeMessageContent(content: string | MultiModalPart[] | null): string | MultiModalPart[] | null {
    if (Array.isArray(content)) {
      if (!this.enableMultimodal) {
        throw new Error('Multimodal content is disabled for NVIDIA NIM provider');
      }
      return content;
    }
    return content ?? '';
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('Missing NVIDIA_NIM_API_KEY');
    }

    const startTime = Date.now();
    const model = request.model || this.defaultModel;
    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const messages = request.messages.map((m) => ({
      role: m.role,
      content: this.serializeMessageContent(m.content),
    }));

    const body: Record<string, any> = {
      model,
      messages,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
    };

    if (this.modeDefault === 'instant') {
      body.extra_body = { thinking: { type: 'disabled' } };
    }

    let response: Response;
    let retries = 0;
    const maxRetries = 3;
    let lastError: Error | null = null;

    while (retries <= maxRetries) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          const choice = data.choices?.[0];
          const content = choice?.message?.content || '';
          const usage = {
            prompt: data.usage?.prompt_tokens || 0,
            completion: data.usage?.completion_tokens || 0,
          };

          const baseResponse = this.createResponse(request, content, usage, model, startTime);

          return {
            ...baseResponse,
            toolCalls: choice?.message?.tool_calls,
            usage: {
              ...baseResponse.usage,
              cost: 0,
            },
          };
        }

        const isRetryable = response.status === 429 || (response.status >= 500 && response.status <= 504);
        if (!isRetryable || retries === maxRetries) {
          const errorText = await response.text();
          throw new Error(redactSecrets(`NVIDIA NIM error ${response.status}: ${errorText}`));
        }

        let delay = Math.pow(2, retries) * 1000;
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!Number.isNaN(parsed)) {
            delay = parsed * 1000;
          }
        }

        retries++;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (e: any) {
        lastError = e;
        if (retries === maxRetries || (e instanceof Error && !e.message.includes('NVIDIA NIM error'))) {
          throw e;
        }
        retries++;
        const delay = Math.pow(2, retries - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}
