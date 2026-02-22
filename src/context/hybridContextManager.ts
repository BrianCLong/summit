export interface Turn {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  observation?: string;
  action?: string;
  reasoning?: string;
  timestamp?: string;
}

export interface AgentContext {
  turns: Turn[];
  summary?: string;
  meta?: Record<string, unknown>;
}

export interface ContextManagementMetrics {
  originalTokenEstimate: number;
  managedTokenEstimate: number;
  estimatedCostReduction: number;
}

export interface HybridContextOptions {
  observationWindow: number;
  summarizationInterval: number;
  summarizationPrompt?: string;
}

export interface LLMClient {
  summarize(text: string, systemPrompt: string): Promise<string>;
  estimateTokens(text: string): number;
}

export class HybridContextManager {
  constructor(
    private readonly llm: LLMClient,
    private readonly options: HybridContextOptions,
  ) {}

  async manageContext(
    context: AgentContext,
  ): Promise<{ context: AgentContext; metrics: ContextManagementMetrics }> {
    const originalTokenEstimate = this.estimateTokenCount(context);

    let managed = this.maskObservations(context);

    if (this.shouldSummarize(managed)) {
      managed = await this.summarize(managed);
    }

    const managedTokenEstimate = this.estimateTokenCount(managed);

    return {
      context: managed,
      metrics: {
        originalTokenEstimate,
        managedTokenEstimate,
        estimatedCostReduction:
          originalTokenEstimate === 0
            ? 0
            : 1 - managedTokenEstimate / originalTokenEstimate,
      },
    };
  }

  private maskObservations(context: AgentContext): AgentContext {
    const { observationWindow } = this.options;
    const turns = [...context.turns];
    const currentTurn = turns.length;

    const masked = turns.map((turn, idx) => {
      const distanceFromEnd = currentTurn - idx;

      if (
        distanceFromEnd > observationWindow &&
        (turn.observation || turn.action)
      ) {
        return {
          ...turn,
          observation: `[omitted observation ${idx}]`,
        };
      }

      return turn;
    });

    return { ...context, turns: masked };
  }

  private shouldSummarize(context: AgentContext): boolean {
    const { summarizationInterval } = this.options;

    if (summarizationInterval <= 0) return false;
    if (context.turns.length === 0) return false;

    return context.turns.length % summarizationInterval === 0;
  }

  private async summarize(context: AgentContext): Promise<AgentContext> {
    const { observationWindow, summarizationPrompt } = this.options;

    const turnsToSummarize = context.turns.slice(
      0,
      Math.max(0, context.turns.length - observationWindow),
    );
    if (turnsToSummarize.length === 0) return context;

    const text = turnsToSummarize
      .map((turn) => `${turn.role}: ${turn.content}`)
      .join('\n');
    const systemPrompt =
      summarizationPrompt ??
      'Summarize the key facts, decisions, and unresolved questions in a compact form. Preserve entities, numbers, and causal relationships.';

    const summary = await this.llm.summarize(text, systemPrompt);

    return {
      ...context,
      summary,
      turns: context.turns.slice(-observationWindow),
    };
  }

  private estimateTokenCount(context: AgentContext): number {
    const textParts: string[] = [];

    if (context.summary) {
      textParts.push(context.summary);
    }

    for (const turn of context.turns) {
      textParts.push(turn.content);
      if (turn.observation) textParts.push(turn.observation);
      if (turn.reasoning) textParts.push(turn.reasoning);
      if (turn.action) textParts.push(turn.action);
    }

    const text = textParts.join('\n');
    return this.llm.estimateTokens(text);
  }
}
