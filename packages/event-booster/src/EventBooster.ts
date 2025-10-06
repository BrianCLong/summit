import { performance } from 'node:perf_hooks';
import {
  BoostPattern,
  BoostRunResult,
  BoostRunSummary,
  EventBoosterOptions,
  EventRecord,
  HistoryEntry,
} from './types.js';

const DEFAULT_PERFORMANCE_BUDGET_MS = 5;
const DEFAULT_HISTORY_LIMIT = 50;

const cloneEvent = (event: EventRecord): EventRecord => ({
  ...event,
  payload: { ...event.payload },
  tags: event.tags ? [...event.tags] : undefined,
});

const freezeOptions = (options: Record<string, unknown>): Readonly<Record<string, unknown>> =>
  Object.freeze({ ...options });

/**
 * Core orchestrator that manages boost pattern registration, execution, and telemetry.
 */
export class EventBooster {
  private readonly patterns = new Map<string, BoostPattern>();
  private readonly history: HistoryEntry[] = [];
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly performanceBudgetMs: number;
  private readonly maxHistory: number;

  constructor(options: EventBoosterOptions = {}) {
    this.performanceBudgetMs = options.performanceBudgetMs ?? DEFAULT_PERFORMANCE_BUDGET_MS;
    this.maxHistory = Math.max(1, options.maxHistory ?? DEFAULT_HISTORY_LIMIT);
    this.now = options.now ?? (() => performance.now());
    this.random = options.random ?? Math.random;

    if (options.initialPatterns) {
      for (const pattern of options.initialPatterns) {
        this.registerPattern(pattern);
      }
    }
  }

  /** Registers a new boost pattern. */
  public registerPattern(pattern: BoostPattern): void {
    if (this.patterns.has(pattern.name)) {
      throw new Error(`Pattern "${pattern.name}" is already registered.`);
    }
    this.patterns.set(pattern.name, pattern);
  }

  /** Removes a registered pattern if present. */
  public unregisterPattern(name: string): boolean {
    return this.patterns.delete(name);
  }

  /** Returns metadata for registered patterns. */
  public listPatterns(): Array<Pick<BoostPattern, 'name' | 'description'>> {
    return Array.from(this.patterns.values()).map((pattern) => ({
      name: pattern.name,
      description: pattern.description,
    }));
  }

  /** Determines if a pattern with the provided name exists. */
  public hasPattern(name: string): boolean {
    return this.patterns.has(name);
  }

  /** Retrieves a registered pattern instance. */
  public getPattern(name: string): BoostPattern | undefined {
    return this.patterns.get(name);
  }

  /** Clears any recorded run summaries. */
  public clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * Returns a copy of the recorded history. The optional limit parameter can be used
   * to retrieve only the most recent entries.
   */
  public getHistory(limit?: number): HistoryEntry[] {
    if (limit === undefined) {
      return [...this.history];
    }
    const safeLimit = Math.max(0, limit);
    return this.history.slice(Math.max(0, this.history.length - safeLimit));
  }

  /**
   * Executes the specified pattern against a batch of events and records telemetry.
   */
  public boost(
    events: readonly EventRecord[],
    patternName: string,
    options: Record<string, unknown> = {},
  ): BoostRunResult {
    const pattern = this.patterns.get(patternName);
    if (!pattern) {
      throw new Error(`Pattern "${patternName}" is not registered.`);
    }

    const view = events.map(cloneEvent);
    const contextOptions = freezeOptions(options);
    const generated: BoostRunResult['events'] = [];

    const startedAt = this.now();
    for (let index = 0; index < view.length; index += 1) {
      const source = view[index];
      const derivatives = pattern.boost(source, {
        index,
        events: view,
        options: contextOptions,
        random: this.random,
      });
      for (const derivative of derivatives) {
        generated.push({
          ...derivative,
          boostPattern: derivative.boostPattern ?? pattern.name,
          sourceEventId: derivative.sourceEventId ?? source.id,
          tags: derivative.tags ? [...derivative.tags] : undefined,
          payload: { ...derivative.payload },
        });
      }
    }
    const finishedAt = this.now();
    const durationMs = Math.max(0, finishedAt - startedAt);
    const summary: BoostRunSummary = {
      patternName,
      inputCount: view.length,
      outputCount: generated.length,
      durationMs,
      budgetExceeded: durationMs > this.performanceBudgetMs,
      startedAt,
      finishedAt,
    };

    this.recordHistory(summary);
    return { ...summary, events: generated };
  }

  /** Convenience helper that generates events from a factory before boosting them. */
  public boostFromGenerator(
    generator: () => readonly EventRecord[],
    patternName: string,
    options: Record<string, unknown> = {},
  ): BoostRunResult {
    return this.boost(generator(), patternName, options);
  }

  private recordHistory(entry: BoostRunSummary): void {
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }
  }
}

export default EventBooster;
