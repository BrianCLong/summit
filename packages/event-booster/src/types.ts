/**
 * Shared type declarations for the Event Booster framework.
 * These types are consumed by the core booster, generators, benchmarks, and public API.
 */
export type EventPayload = Record<string, unknown>;

/** Describes the minimal contract for an event processed by the booster. */
export interface EventRecord {
  /** Unique identifier for the event. */
  id: string;
  /** Epoch timestamp in milliseconds. */
  timestamp: number;
  /** Arbitrary payload metadata associated with the event. */
  payload: EventPayload;
  /** Optional list of tags for downstream filtering. */
  tags?: string[];
}

/** Extends {@link EventRecord} with provenance metadata for boosted events. */
export interface BoostedEvent extends EventRecord {
  /** Identifier of the source event that generated this boosted derivative. */
  sourceEventId: string;
  /** Name of the boost pattern that produced this event. */
  boostPattern: string;
  /** Relative score indicating the strength of the boost. */
  boostScore: number;
  /** Additional metadata emitted by the pattern. */
  metadata?: Record<string, unknown>;
}

/** Context provided to a boost pattern invocation. */
export interface BoostContext {
  /** Index of the source event within the batch being processed. */
  index: number;
  /** Immutable view of all source events. */
  events: readonly EventRecord[];
  /** Options supplied by the caller. */
  options: Readonly<Record<string, unknown>>;
  /** Random number generator that patterns can use for reproducible noise. */
  random: () => number;
}

/** Blueprint for a boost pattern implementation. */
export interface BoostPattern {
  /** Canonical name of the pattern. */
  name: string;
  /** Human readable description for documentation and discovery. */
  description: string;
  /**
   * Transforms an event into zero or more boosted derivatives.
   * Patterns must avoid mutating the source event and should create new object references.
   */
  boost(event: EventRecord, context: BoostContext): readonly BoostedEvent[];
}

/** Summary metrics captured for each boost invocation. */
export interface BoostRunSummary {
  patternName: string;
  inputCount: number;
  outputCount: number;
  durationMs: number;
  budgetExceeded: boolean;
  startedAt: number;
  finishedAt: number;
}

/** Result payload returned from {@link EventBooster.boost}. */
export interface BoostRunResult extends BoostRunSummary {
  events: BoostedEvent[];
}

/** Configuration object supplied when instantiating {@link EventBooster}. */
export interface EventBoosterOptions {
  /** Performance budget in milliseconds for a single boost call. */
  performanceBudgetMs?: number;
  /** Maximum number of historical summaries to retain. */
  maxHistory?: number;
  /** Clock override for deterministic testing. */
  now?: () => number;
  /** Default random generator for boost contexts. */
  random?: () => number;
  /** Optional patterns to pre-register. */
  initialPatterns?: BoostPattern[];
}

/** Immutable snapshot of a boost run stored in history. */
export type HistoryEntry = BoostRunSummary;
