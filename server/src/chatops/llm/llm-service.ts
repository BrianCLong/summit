
export interface LLMResponse {
  model: string;
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ModelProvider {
  generateText(prompt: string, system?: string): Promise<LLMResponse>;
  generateJSON<T>(prompt: string, schema: any, system?: string): Promise<T>;
}

/**
 * Mock LLM Service simulating multi-model consensus.
 */
export class LLMService {
  private models = ['claude-3-opus', 'gpt-4-turbo', 'qwen-max'];

  /**
   * Generates text from a specific model or defaults to the primary one.
   */
  async generateText(prompt: string, model: string = 'gpt-4-turbo'): Promise<LLMResponse> {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      model,
      content: this.mockResponse(prompt, model),
      usage: { input_tokens: 10, output_tokens: 20 }
    };
  }

  /**
   * Simulates running the same prompt across multiple models and aggregating results.
   * For the prototype, we return the raw votes.
   */
  async consensus(prompt: string, taskType: 'intent' | 'analysis'): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    await Promise.all(this.models.map(async (model) => {
        const res = await this.generateText(prompt, model);
        results[model] = res.content;
    }));

    return results;
  }

  private mockResponse(prompt: string, model: string): string {
    const lower = prompt.toLowerCase();

    // Mock Intent Classification
    if (prompt.includes('Intent Classification')) {
        if (lower.includes('search') || lower.includes('find') || lower.includes('who')) return 'query';
        if (lower.includes('scan') || lower.includes('analyze')) return 'analysis';
        if (lower.includes('add') || lower.includes('create')) return 'graph_mutation';
        return 'query'; // Default
    }

    // Mock Summarization
    if (prompt.includes('Summarize this conversation')) {
        return `[${model}] Summary: User asked about ${prompt.substring(0, 20)}...`;
    }

    // Mock Entity Extraction (if handled by LLM)
    if (prompt.includes('Extract entities')) {
        if (lower.includes('apt29')) return JSON.stringify(['APT29']);
        return JSON.stringify([]);
    }

    // Default chatter
    return `[${model}] Processed: ${prompt.substring(0, 50)}...`;
  }
}
