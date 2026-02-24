export interface Turn {
  role: "user" | "assistant" | "tool";
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
    private readonly options: HybridContextOptions
  ) {}

  async manageContext(
    context: AgentContext
  ): Promise<{ context: AgentContext; metrics: ContextManagementMetrics }> {
    const originalTokenEstimate = this.estimateTokenCount(context);

    let managed = this.maskObservations(context);
    if (this.shouldSummarize(managed)) {
      managed = await this.summarize(managed);
    }

    const managedTokenEstimate = this.estimateTokenCount(managed);
    const estimatedCostReduction =
      originalTokenEstimate === 0
        ? 0
        : Math.max(0, 1 - managedTokenEstimate / originalTokenEstimate);

    return {
      context: managed,
      metrics: {
        originalTokenEstimate,
        managedTokenEstimate,
        estimatedCostReduction,
      },
    };
  }

  private maskObservations(context: AgentContext): AgentContext {
    const observationWindow = Math.max(0, this.options.observationWindow);
    const currentTurn = context.turns.length;

    const turns = context.turns.map((turn, index) => {
      const distanceFromEnd = currentTurn - index;
      if (
        distanceFromEnd > observationWindow &&
        (turn.observation !== undefined || turn.action !== undefined)
      ) {
        return {
          ...turn,
          observation: `[omitted observation ${index}]`,
          action: turn.action ? `[omitted action ${index}]` : turn.action,
        };
      }
      return turn;
    });

    return { ...context, turns };
  }

  private shouldSummarize(context: AgentContext): boolean {
    const interval = this.options.summarizationInterval;
    if (interval <= 0 || context.turns.length === 0) {
      return false;
    }
    return context.turns.length % interval === 0;
  }

  private async summarize(context: AgentContext): Promise<AgentContext> {
    const observationWindow = Math.max(0, this.options.observationWindow);
    const summarizeUntil = Math.max(0, context.turns.length - observationWindow);
    const turnsToSummarize = context.turns.slice(0, summarizeUntil);
    if (turnsToSummarize.length === 0) {
      return context;
    }

    const text = turnsToSummarize.map((turn) => `${turn.role}: ${turn.content}`).join("\n");
    const systemPrompt =
      this.options.summarizationPrompt ??
      "Summarize key facts, decisions, unresolved questions, and critical values.";
    const summary = await this.llm.summarize(text, systemPrompt);

    return {
      ...context,
      summary,
      turns: context.turns.slice(-observationWindow),
    };
  }

  private estimateTokenCount(context: AgentContext): number {
    const segments: string[] = [];
    if (context.summary) {
      segments.push(context.summary);
    }

    for (const turn of context.turns) {
      segments.push(turn.content);
      if (turn.observation) segments.push(turn.observation);
      if (turn.action) segments.push(turn.action);
      if (turn.reasoning) segments.push(turn.reasoning);
    }

    return this.llm.estimateTokens(segments.join("\n"));
  }
}
