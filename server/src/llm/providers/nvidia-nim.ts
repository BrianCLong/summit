
import { LlmProvider, ProviderId, ChatCompletionRequest, ChatCompletionResult } from '../types.js';
import { redactSecrets } from '../safety/log_redaction.js';

export class NvidiaNimProvider implements LlmProvider {
  id: ProviderId = 'nvidia_nim';
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
    this.apiKey = config.apiKey || process.env.NVIDIA_NIM_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://integrate.api.nvidia.com/v1';
    this.defaultModel = config.model || 'moonshotai/kimi-k2.5';
    this.modeDefault = config.modeDefault || 'instant';
    this.enableMultimodal = config.enableMultimodal || false;
  }

  supports(model: string): boolean {
    return model === this.defaultModel || model.startsWith('moonshotai/');
  }

  async chat(request: ChatCompletionRequest & { model: string }): Promise<ChatCompletionResult> {
    if (!this.apiKey) {
      throw new Error('Missing NVIDIA_NIM_API_KEY');
    }

    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const messages = request.messages.map(m => {
      if (Array.isArray(m.content)) {
        if (!this.enableMultimodal) {
          throw new Error('Multimodal content is disabled for NVIDIA NIM provider');
        }
        return {
          role: m.role,
          content: m.content
        };
      }
      return {
        role: m.role,
        content: m.content
      };
    });

    const body: any = {
      model: request.model || this.defaultModel,
      messages,
      max_tokens: 1024,
      temperature: request.temperature ?? 0.7,
    };

    // Mode handling: default to config default unless requested
    const mode = (request as any).mode ?? this.modeDefault;
    if (mode === 'instant') {
      body.extra_body = { thinking: { type: 'disabled' } };
    }

    if (request.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }
      }));
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
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const data = await response.json();
          const choice = data.choices?.[0];

          return {
            provider: 'nvidia_nim',
            model: data.model || request.model,
            content: choice?.message?.content || null,
            toolCalls: choice?.message?.tool_calls?.map((tc: any) => ({
              toolName: tc.function.name,
              args: JSON.parse(tc.function.arguments),
              id: tc.id
            })),
            usage: {
              inputTokens: data.usage?.prompt_tokens || 0,
              outputTokens: data.usage?.completion_tokens || 0,
              totalTokens: data.usage?.total_tokens || 0,
              costUsd: 0 // Free trial
            },
            raw: data
          };
        }

        const isRetryable = response.status === 429 || (response.status >= 500 && response.status <= 504);
        if (!isRetryable || retries === maxRetries) {
          const errorText = await response.text();
          throw new Error(redactSecrets(`NVIDIA NIM error ${response.status}: ${errorText}`));
        }

        // Handle Retry-After header
        let delay = Math.pow(2, retries) * 1000;
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed)) {
            delay = parsed * 1000;
          }
        }

        retries++;
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (e: any) {
        lastError = e;
        if (retries === maxRetries || (e instanceof Error && !e.message.includes('NVIDIA NIM error'))) {
          throw e;
        }
        retries++;
        const delay = Math.pow(2, retries - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}
