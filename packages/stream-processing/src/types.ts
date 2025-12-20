import { StreamMessage } from '@intelgraph/kafka-integration';

/**
 * Window types
 */
export enum WindowType {
  TUMBLING = 'tumbling',
  SLIDING = 'sliding',
  SESSION = 'session',
  GLOBAL = 'global',
}

/**
 * Time semantics
 */
export enum TimeSemantics {
  EVENT_TIME = 'event_time',
  PROCESSING_TIME = 'processing_time',
  INGESTION_TIME = 'ingestion_time',
}

/**
 * Window definition
 */
export interface WindowSpec {
  type: WindowType;
  size: number;
  slide?: number; // For sliding windows
  gap?: number; // For session windows
  timeSemantics: TimeSemantics;
}

/**
 * Windowed message
 */
export interface WindowedMessage<T = unknown> {
  window: Window;
  messages: StreamMessage<T>[];
  count: number;
  startTime: number;
  endTime: number;
}

/**
 * Window instance
 */
export interface Window {
  id: string;
  start: number;
  end: number;
  type: WindowType;
}

/**
 * Watermark
 */
export interface Watermark {
  timestamp: number;
  maxOutOfOrderness: number;
}

/**
 * State backend types
 */
export enum StateBackend {
  MEMORY = 'memory',
  REDIS = 'redis',
  ROCKSDB = 'rocksdb',
}

/**
 * State descriptor
 */
export interface StateDescriptor<T = unknown> {
  name: string;
  defaultValue?: T;
  ttl?: number;
}

/**
 * Aggregation function
 */
export type AggregateFunction<T, A, R> = {
  createAccumulator: () => A;
  add: (value: T, accumulator: A) => A;
  getResult: (accumulator: A) => R;
  merge?: (acc1: A, acc2: A) => A;
};

/**
 * Join types
 */
export enum JoinType {
  INNER = 'inner',
  LEFT = 'left',
  RIGHT = 'right',
  FULL_OUTER = 'full_outer',
}

/**
 * Join specification
 */
export interface JoinSpec {
  type: JoinType;
  leftKey: string;
  rightKey: string;
  windowSpec: WindowSpec;
}

/**
 * Stream operator
 */
export interface StreamOperator<I, O> {
  name: string;
  process: (input: I) => Promise<O | O[]>;
}

/**
 * Checkpoint configuration
 */
export interface CheckpointConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  minPauseBetweenCheckpoints: number;
  maxConcurrentCheckpoints: number;
  backend: StateBackend;
}

/**
 * Stream processing context
 */
export interface ProcessingContext {
  timestamp: number;
  watermark: number;
  currentKey?: string;
}

/**
 * Late data handling strategy
 */
export enum LateDataStrategy {
  DROP = 'drop',
  SIDE_OUTPUT = 'side_output',
  UPDATE_WINDOW = 'update_window',
}

/**
 * Side output tag
 */
export interface SideOutputTag<T = unknown> {
  id: string;
  type: string;
}

/**
 * Pattern for Complex Event Processing
 */
export interface Pattern {
  name: string;
  conditions: PatternCondition[];
  window: WindowSpec;
  skip?: 'skip_past_last_event' | 'skip_to_first' | 'skip_to_last';
}

/**
 * Pattern condition
 */
export interface PatternCondition {
  type: 'simple' | 'iterative' | 'looping';
  predicate: (event: any) => boolean;
  quantifier?: {
    type: 'one_or_more' | 'zero_or_more' | 'times';
    times?: number;
  };
}

/**
 * Pattern match result
 */
export interface PatternMatch<T = unknown> {
  pattern: string;
  events: T[];
  startTime: number;
  endTime: number;
}

/**
 * Backpressure strategy
 */
export enum BackpressureStrategy {
  DROP_OLDEST = 'drop_oldest',
  DROP_NEWEST = 'drop_newest',
  BLOCK = 'block',
  SAMPLE = 'sample',
}
