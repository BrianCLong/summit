import { MoonshotConfig, loadMoonshotConfig } from "./config.js";
import { ChatCompletionRequest, ChatCompletionResponse } from "./types.js";

export class MoonshotClient {
  private config: MoonshotConfig;

  constructor(config?: MoonshotConfig) {
    this.config = config ?? loadMoonshotConfig(process.env);
  }

  async chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.config.enabled) {
      throw new Error("Moonshot provider is disabled. Set SUMMIT_PROVIDER_MOONSHOT_KIMI=1 to enable.");
    }

    const url = `${this.config.baseUrl}/chat/completions`;
    let attempt = 0;
    const maxRetries = 3;
    let lastError;

    while (attempt <= maxRetries) {
        try {
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.config.apiKey}`
              },
              body: JSON.stringify(req)
            });

            if (response.ok) {
                return response.json() as Promise<ChatCompletionResponse>;
            }

            if (response.status === 429 || response.status >= 500) {
                 const errorText = await response.text();
                 lastError = new Error(`Moonshot API error: ${response.status} ${errorText}`);
                 attempt++;
                 if (attempt <= maxRetries) {
                     await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
                     continue;
                 }
            } else {
                 const errorText = await response.text();
                 throw new Error(`Moonshot API error: ${response.status} ${errorText}`);
            }
        } catch (e) {
             lastError = e;
             attempt++;
             if (attempt <= maxRetries) {
                 await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                 continue;
             }
        }
    }
    throw lastError;
  }
}
