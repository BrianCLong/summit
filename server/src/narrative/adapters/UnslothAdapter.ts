import type {
  LLMClient,
  LLMNarrativeRequest,
  NarrativeState,
  NarrativeEvent,
} from '../types.js';

export interface UnslothAdapterConfig {
  baseUrl: string; // e.g., 'http://localhost:8000/v1' for vLLM
  apiKey?: string;
  model: string; // e.g., 'unsloth/llama-3-8b-instruct'
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Adapter for Unsloth-finetuned models, enabling 500k context handling via compatible inference servers (e.g., vLLM).
 *
 * Unlike standard adapters that might aggressively truncate context, this adapter assumes
 * the underlying model supports extended context windows (up to 500k tokens) and serializes
 * the full narrative history.
 */
export class UnslothAdapter implements LLMClient {
  private readonly config: Required<UnslothAdapterConfig>;

  constructor(config: UnslothAdapterConfig) {
    this.config = {
      apiKey: 'EMPTY', // Default for many local servers like vLLM
      timeout: 120000, // Long timeout for long context
      maxTokens: 4096,
      temperature: 0.7,
      ...config,
    };
  }

  async generateNarrative(request: LLMNarrativeRequest): Promise<string> {
    const prompt = this.constructPrompt(request.state, request.recentEvents);

    return this.callInferenceServer(prompt);
  }

  /**
   * Constructs a comprehensive prompt utilizing the long context window.
   */
  private constructPrompt(state: NarrativeState, recentEvents: NarrativeEvent[]): string {
    // Serialization logic optimized for models that can ingest full state history
    // We include detailed entity states, full parameter history, and arc progression.

    const context = {
      simulationName: state.name,
      currentTick: state.tick,
      themes: state.themes,
      entities: Object.values(state.entities).map(e => ({
        name: e.name,
        role: e.type,
        sentiment: e.sentiment.toFixed(2),
        influence: e.influence.toFixed(2),
        trend: e.trend,
        history: e.history // Full history included due to high context limit
      })),
      parameters: Object.values(state.parameters).map(p => ({
        name: p.name,
        value: p.value.toFixed(2),
        trend: p.trend,
        history: p.history
      })),
      narrativeArcs: state.arcs.map(arc => ({
        theme: arc.theme,
        momentum: arc.momentum.toFixed(2),
        outlook: arc.outlook,
        currentNarrative: arc.narrative
      })),
      recentEvents: recentEvents.map(e => ({
        tick: e.scheduledTick,
        type: e.type,
        description: e.description,
        impact: {
          sentiment: e.sentimentShift,
          influence: e.influenceShift
        }
      }))
    };

    return `
You are the Narrative Engine for a highly complex simulation named "${state.name}".
Your goal is to generate a cohesive narrative summary, identify emerging risks, and spot opportunities.

Current Simulation State (JSON):
${JSON.stringify(context, null, 2)}

Instructions:
1. Analyze the correlation between entity sentiment shifts and parameter trends.
2. Synthesize the recent events into a coherent story segment.
3. Identify specific risks where negative sentiment is accelerating.
4. Identify opportunities where influence is high and sentiment is positive.

Output Format:
Provide a text response with the following sections:
- Summary: A paragraph describing the current state of the world.
- Risks: Bullet points of potential threats.
- Opportunities: Bullet points of potential gains.
`;
  }

  private async callInferenceServer(prompt: string): Promise<string> {
    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: 'You are a master storyteller and strategic analyst.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Unsloth Adapter Error (${response.status}): ${text}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No content generated.';
    } catch (error) {
      // In a real implementation, we might want to log this better
      throw new Error(`Failed to call Unsloth inference server: ${(error as Error).message}`);
    }
  }
}
