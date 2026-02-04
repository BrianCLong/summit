import { BaseProvider } from './base.js';
import { LLMRequest, LLMResponse, ProviderType } from '../types.js';
import { redactSecrets } from '../safety/log_redaction.js';
import { randomUUID } from 'crypto';

export interface NvidiaNimConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  enableMultimodal?: boolean;
  modeDefault?: "instant" | "thinking";
}

export class NvidiaNimProvider extends BaseProvider {
  name: ProviderType = 'nvidia_nim';
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private enableMultimodal: boolean;
  private modeDefault: "instant" | "thinking";

  constructor(config: NvidiaNimConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://integrate.api.nvidia.com/v1';
    this.model = config.model || 'moonshotai/kimi-k2.5';
    this.enableMultimodal = config.enableMultimodal || false;
    this.modeDefault = config.modeDefault || "instant";

    this.capabilities = [
      {
        name: this.model,
        tags: ['text'],
        inputCostPer1k: 0,
        outputCostPer1k: 0
      }
    ];
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;

    // Map messages
    const messages = request.messages.map(m => {
      if (Array.isArray(m.content) && !this.enableMultimodal) {
        throw new Error("Multimodal content not enabled for this provider");
      }
      return {
        role: m.role,
        content: m.content
      };
    });

    const body: any = {
      model: this.model,
      messages,
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature ?? 0.7
    };

    if (this.modeDefault === "instant") {
      body.extra_body = { thinking: { type: "disabled" } };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(redactSecrets(`NIM error ${res.status}: ${txt}`));
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const content = choice?.message?.content || "";

      const usage = {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0
      };

      return this.createResponse(
        request,
        content,
        usage,
        data.model || this.model,
        startTime
      );
    } catch (err: any) {
      throw new Error(redactSecrets(err.message));
    }
  }
}
