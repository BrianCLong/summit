import { estimateMessagesTokens, estimateTokensFromString } from './token-estimator';
import {
  AgentTurn,
  ContextDiagnostics,
  ContextManager,
  ContextPersistence,
  PromptContextOptions,
  PromptContextResult,
  Summarizer,
} from './types';
import { NoopContextPersistence } from './persistence';

interface ContextManagerConfig {
  defaultStrategy?: 'masking' | 'summarization' | 'hybrid' | 'raw';
  maskingWindow?: number;
  summarizationTurnThreshold?: number;
  summarizationTokenThreshold?: number;
  reservedForResponse?: number;
  maxContextPct?: number;
  plateauWindow?: number;
  persistence?: ContextPersistence;
  summaryMaxTokens?: number;
  summarizer?: Summarizer;
}

export class AgentContextManager implements ContextManager {
  private readonly turns: AgentTurn[] = [];
  private runningSummary = '';
  private turnsSinceLastSummary = 0;
  private readonly persistence: ContextPersistence;
  private readonly summarizer: Summarizer;
  private readonly config: Required<Omit<ContextManagerConfig, 'persistence' | 'summarizer'>> & {
    persistence: ContextPersistence;
    summarizer: Summarizer;
  };

  constructor(config?: ContextManagerConfig) {
    this.persistence = config?.persistence ?? new NoopContextPersistence();
    this.summarizer = config?.summarizer ?? this.defaultSummarizer.bind(this);
    this.config = {
      defaultStrategy: config?.defaultStrategy || 'masking',
      maskingWindow: config?.maskingWindow ?? 10,
      summarizationTurnThreshold: config?.summarizationTurnThreshold ?? 12,
      summarizationTokenThreshold: config?.summarizationTokenThreshold ?? 7000,
      reservedForResponse: config?.reservedForResponse ?? 1000,
      maxContextPct: config?.maxContextPct ?? 0.85,
      plateauWindow: config?.plateauWindow ?? 5,
      persistence: this.persistence,
      summaryMaxTokens: config?.summaryMaxTokens ?? 2000,
      summarizer: this.summarizer,
    };
  }

  async ingestTurn(turn: AgentTurn): Promise<void> {
    const turnIndex = this.turns.length;
    const enrichedTurn: AgentTurn = {
      ...turn,
      meta: {
        ...turn.meta,
        turnIndex,
        timestamp: turn.meta?.timestamp ?? new Date().toISOString(),
      },
    };
    this.turns.push(enrichedTurn);
    this.turnsSinceLastSummary += 1;
    await this.persistence.persist(enrichedTurn);
  }

  async buildPromptContext(
    options: PromptContextOptions,
  ): Promise<PromptContextResult> {
    const strategy = options.strategy || this.config.defaultStrategy;
    const maskingWindow = options.maskingWindow ?? this.config.maskingWindow;
    const summarizationTurnThreshold =
      options.summarizationTurnThreshold ??
      this.config.summarizationTurnThreshold;
    const summarizationTokenThreshold =
      options.summarizationTokenThreshold ??
      this.config.summarizationTokenThreshold;
    const plateauWindow = options.plateauWindow ?? this.config.plateauWindow;
    const summaryMaxTokens = options.summaryMaxTokens ?? this.config.summaryMaxTokens;

    const reservedForResponse =
      options.reservedForResponse ?? this.config.reservedForResponse;
    const maxContextPct = options.maxContextPct ?? this.config.maxContextPct;
    const usableBudget = Math.max(
      0,
      Math.floor(options.tokenBudget * maxContextPct) - reservedForResponse,
    );

    const stopReasons: string[] = [];
    const overTurnCap =
      typeof options.maxTurns === 'number' && this.turns.length >= options.maxTurns;
    const overCostCap =
      typeof options.maxCostUsd === 'number' &&
      this.calculateTotalCost() >= options.maxCostUsd;

    if (overTurnCap) {
      stopReasons.push(`maxTurns (${options.maxTurns}) reached`);
    }
    if (overCostCap) {
      stopReasons.push(`maxCostUsd (${options.maxCostUsd}) reached`);
    }

    const plateauSignal = this.detectPlateau(plateauWindow);
    if (plateauSignal) {
      stopReasons.push(plateauSignal);
    }

    const applyMasking = strategy === 'masking' || strategy === 'hybrid';
    const turnsToSummarize = this.turns.slice(0, -maskingWindow);

    let summaryCalls = 0;
    let summaryTokens = 0;

    if ((strategy === 'summarization' || strategy === 'hybrid') && turnsToSummarize.length > 0) {
      const rawTokens = this.estimateTurnsTokens(this.turns);
      const shouldSummarize = this.shouldSummarize({
        turnThreshold: summarizationTurnThreshold,
        tokenThreshold: summarizationTokenThreshold,
        usableBudget,
        rawTokens,
      });

      if (shouldSummarize) {
        const summary = await this.summarizer({
          turns: turnsToSummarize,
          maxTokens: summaryMaxTokens,
        });
        if (summary) {
          this.runningSummary = summary;
          this.turnsSinceLastSummary = 0;
          summaryCalls += 1;
          summaryTokens = estimateTokensFromString(summary);
        }
      }
    }

    const messages: Array<{ role: string; content: string }> = [];
    let runningTokens = 0;

    const includeSummary =
      this.runningSummary && (strategy === 'summarization' || strategy === 'hybrid');

    if (includeSummary) {
      const summaryContent = `Prior summary: ${this.runningSummary}`;
      const summaryEstimated = estimateTokensFromString(summaryContent) + 2;
      if (summaryEstimated <= usableBudget) {
        messages.push({ role: 'system', content: summaryContent });
        runningTokens += summaryEstimated;
      } else if (usableBudget > 0) {
        const trimmed = this.trimToTokenBudget(summaryContent, usableBudget - 2);
        messages.push({ role: 'system', content: trimmed });
        runningTokens += estimateTokensFromString(trimmed) + 2;
      }
    }

    const recentTurns = this.turns.slice(-maskingWindow);
    const includeOlder = !includeSummary;
    const olderTurns = includeOlder ? turnsToSummarize : [];

    let maskedObservations = 0;
    let maskedObservationTokens = 0;

    const formattedOlder = olderTurns.map((turn) => {
      if (!applyMasking || !turn.observation?.content) {
        return this.formatTurn(turn);
      }
      maskedObservations += 1;
      maskedObservationTokens += estimateTokensFromString(turn.observation.content);
      return this.formatTurn({
        ...turn,
        observation: {
          ...turn.observation,
          content: '[OMITTED_OBSERVATION: too old; available in memory store]',
        },
      });
    });

    const formattedRecent = recentTurns.map((turn) => this.formatTurn(turn));
    const orderedMessages = [...formattedOlder, ...formattedRecent].map((content) => ({
      role: 'assistant',
      content,
    }));

    for (const message of orderedMessages) {
      const estimated = estimateTokensFromString(message.content) + 2;
      if (runningTokens + estimated > usableBudget) {
        break;
      }
      messages.push(message);
      runningTokens += estimated;
    }

    const contextTokensOut = estimateMessagesTokens(messages);
    const contextTokensIn = this.estimateTurnsTokens(this.turns);

    const diagnostics: ContextDiagnostics = {
      strategy,
      totalTurns: this.turns.length,
      turnsConsidered: messages.length,
      maskedObservations,
      maskedObservationTokens,
      summaryCalls,
      summaryTokens,
      contextTokensIn,
      contextTokensOut,
      contextTokensBudget: usableBudget,
      estimatedCostUsd: this.calculateCostEstimate(contextTokensOut),
      turnCountSinceLastSummary: this.turnsSinceLastSummary,
      stopReasons,
      shouldHalt: overTurnCap || overCostCap,
      runningSummary: includeSummary ? this.runningSummary : undefined,
    };

    return { messages, diagnostics };
  }

  private defaultSummarizer(input: { turns: AgentTurn[]; maxTokens: number }): string {
    const flattened = input.turns
      .map((turn, index) => {
        const observation = turn.observation?.content
          ? ` Observation: ${turn.observation.content}`
          : '';
        const action = turn.action ? ` Action: ${turn.action}` : '';
        return `T${index + 1}: Reasoning: ${turn.reasoning}.${action}${observation}`;
      })
      .join('\n');

    return this.trimToTokenBudget(
      `Summary of earlier turns: ${flattened}`,
      input.maxTokens,
    );
  }

  private shouldSummarize(input: {
    turnThreshold: number;
    tokenThreshold: number;
    usableBudget: number;
    rawTokens: number;
  }): boolean {
    const { turnThreshold, tokenThreshold, usableBudget, rawTokens } = input;
    const budgetLimit = Math.min(tokenThreshold, usableBudget || tokenThreshold);

    return (
      this.turnsSinceLastSummary >= turnThreshold ||
      rawTokens >= budgetLimit
    );
  }

  private detectPlateau(windowSize: number): string | null {
    if (this.turns.length < windowSize) {
      return null;
    }
    const recent = this.turns.slice(-windowSize);
    const stalled = recent.every(
      (turn) =>
        turn.meta?.status === 'failed' || turn.meta?.status === 'no-progress',
    );
    if (stalled) {
      return `No progress detected in last ${windowSize} turns`;
    }
    return null;
  }

  private calculateTotalCost(): number {
    return this.turns.reduce((acc, turn) => acc + (turn.meta?.costUsd || 0), 0);
  }

  private calculateCostEstimate(promptTokens: number): number {
    const costPerThousand = 0.002; // nominal default
    return (promptTokens / 1000) * costPerThousand;
  }

  private estimateTurnsTokens(turns: AgentTurn[]): number {
    return turns.reduce((total, turn) => total + this.estimateTurnTokens(turn), 0);
  }

  private estimateTurnTokens(turn: AgentTurn): number {
    return (
      estimateTokensFromString(turn.reasoning) +
      estimateTokensFromString(turn.action || '') +
      estimateTokensFromString(turn.observation?.content || '')
    );
  }

  private trimToTokenBudget(content: string, maxTokens: number): string {
    if (maxTokens <= 0) {
      return '';
    }
    const estimated = estimateTokensFromString(content);
    if (estimated <= maxTokens) {
      return content;
    }
    const maxChars = maxTokens * 4;
    return content.slice(0, Math.max(0, maxChars)).trim();
  }

  private formatTurn(turn: AgentTurn): string {
    const chunks = [
      `Reasoning: ${turn.reasoning}`,
      turn.action ? `Action: ${turn.action}` : undefined,
      turn.observation?.content
        ? `Observation (${turn.observation.type || 'unknown'}): ${turn.observation.content}`
        : undefined,
    ].filter(Boolean);
    return chunks.join('\n');
  }
}
