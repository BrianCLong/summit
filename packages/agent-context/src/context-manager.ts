 
import { estimateMessagesTokens, estimateTokensFromString } from './token-estimator';
import {
  AgentTurn,
  ContextDiagnostics,
  ContextManager,
  ContextPersistence,
  PromptContextOptions,
  PromptContextResult,
} from './types';
import { FileContextPersistence } from './persistence';

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
}

export class AgentContextManager implements ContextManager {
  private readonly turns: AgentTurn[] = [];
  private runningSummary = '';
  private turnsSinceLastSummary = 0;
  private readonly persistence: ContextPersistence;
  private readonly config: Required<Omit<ContextManagerConfig, 'persistence' | 'summaryMaxTokens'>> & {
    persistence: ContextPersistence;
    summaryMaxTokens: number;
  };

  constructor(config?: ContextManagerConfig) {
    this.persistence = config?.persistence || new FileContextPersistence();
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
    };
  }

  async ingestTurn(turn: AgentTurn): Promise<void> {
    this.turns.push(turn);
    this.turnsSinceLastSummary += 1;
    await this.persistence.persist(turn);
  }

    async buildPromptContext(options: PromptContextOptions): Promise<PromptContextResult> {
    const strategy = options.strategy || this.config.defaultStrategy;
    const maskingWindow = options.maskingWindow ?? this.config.maskingWindow;
    const summarizationTurnThreshold = options.summarizationTurnThreshold ?? this.config.summarizationTurnThreshold;
    const summarizationTokenThreshold = options.summarizationTokenThreshold ?? this.config.summarizationTokenThreshold;
    const plateauWindow = options.plateauWindow ?? this.config.plateauWindow;

    const reservedForResponse = options.reservedForResponse ?? this.config.reservedForResponse;
    const maxContextPct = options.maxContextPct ?? this.config.maxContextPct;
    const usableBudget = Math.max(0, Math.floor(options.tokenBudget * maxContextPct) - reservedForResponse);

    const messages: Array<{ role: string; content: string }> = [];
    let summaryCalls = 0;
    let summaryTokens = 0;
    const stopReasons: string[] = [];

    const overTurnCap = options.maxTurns && this.turns.length >= options.maxTurns;
    const overCostCap = options.maxCostUsd && this.calculateTotalCost() >= options.maxCostUsd;
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

    let maskedObservations = 0;
    let runningTokens = 0;
    const applyMasking = strategy === 'masking' || strategy === 'hybrid';

    await Promise.resolve();

    if (strategy === 'summarization' || strategy === 'hybrid') {
      const shouldSummarize = this.shouldSummarize(
        summarizationTurnThreshold,
        summarizationTokenThreshold,
        usableBudget,
      );
      if (shouldSummarize && this.turns.length > 0) {
        const summary = this.summarizeTurns(this.turns.slice(0, -maskingWindow));
        this.runningSummary = summary;
        this.turnsSinceLastSummary = 0;
        summaryCalls += 1;
        summaryTokens = estimateTokensFromString(summary);
      }
    }

    if (this.runningSummary) {
      messages.push({ role: 'system', content: `Prior summary: ${this.runningSummary}` });
    }

    const recentTurns = this.turns.slice(-maskingWindow);
    const includeOlder = !(strategy === 'summarization' && this.runningSummary);
    const olderTurns = includeOlder ? this.turns.slice(0, -maskingWindow) : [];

    const formattedOlder = olderTurns.map((turn) => {
      if (!applyMasking) {
        return this.formatTurn(turn);
      }
      const observation = turn.observation?.content
        ? '[OMITTED_OBSERVATION: too old; available in memory store]'
        : undefined;
      if (turn.observation?.content) {
        maskedObservations += 1;
      }
      return this.formatTurn({ ...turn, observation: observation ? { ...turn.observation, content: observation } : turn.observation });
    });

    const formattedRecent = recentTurns.map((turn) => this.formatTurn(turn));

    const orderedMessages = [...formattedOlder, ...formattedRecent].map((content) => ({ role: 'assistant', content }));

    for (const message of orderedMessages) {
      const estimated = estimateTokensFromString(message.content);
      if (runningTokens + estimated > usableBudget) {
        break;
      }
      messages.push(message);
      runningTokens += estimated;
    }

    const diagnostics: ContextDiagnostics = {
      strategy,
      totalTurns: this.turns.length,
      turnsConsidered: messages.length,
      maskedObservations,
      summaryCalls,
      summaryTokens,
      contextTokensIn: estimateMessagesTokens(messages),
      contextTokensOut: usableBudget,
      estimatedCostUsd: this.calculateCostEstimate(estimateMessagesTokens(messages)),
      turnCountSinceLastSummary: this.turnsSinceLastSummary,
      stopReasons,
      runningSummary: this.runningSummary || undefined,
    };

    return { messages, diagnostics };
  }

  private summarizeTurns(turns: AgentTurn[]): string {
    const flattened = turns
      .map((turn, index) => {
        const observation = turn.observation?.content ? ` Observation: ${turn.observation.content}` : '';
        const action = turn.action ? ` Action: ${turn.action}` : '';
        return `T${index + 1}: Reasoning: ${turn.reasoning}.${action}${observation}`;
      })
      .join('\n');
    const limited = flattened.split(/\s+/).slice(0, this.config.summaryMaxTokens).join(' ');
    return `Summary of earlier turns: ${limited}`;
  }

  private shouldSummarize(turnThreshold: number, tokenThreshold: number, usableBudget: number): boolean {
    const estimated = estimateTokensFromString(this.runningSummary || '') + this.turns.reduce((acc, turn) => {
      return acc + estimateTokensFromString(turn.reasoning) + estimateTokensFromString(turn.action || '') + estimateTokensFromString(turn.observation?.content || '');
    }, 0);

    return this.turnsSinceLastSummary >= turnThreshold || estimated > Math.min(tokenThreshold, usableBudget);
  }

  private detectPlateau(windowSize: number): string | null {
    if (this.turns.length < windowSize) {
      return null;
    }
    const recent = this.turns.slice(-windowSize);
    const stalled = recent.every((turn) => turn.meta?.status === 'failed' || turn.meta?.status === 'no-progress');
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

  private formatTurn(turn: AgentTurn): string {
    const chunks = [
      `Reasoning: ${turn.reasoning}`,
      turn.action ? `Action: ${turn.action}` : undefined,
      turn.observation?.content ? `Observation (${turn.observation.type || 'unknown'}): ${turn.observation.content}` : undefined,
    ].filter(Boolean);
    return chunks.join('\n');
  }
}
