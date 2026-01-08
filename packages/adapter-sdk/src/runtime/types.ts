import type { SASLOptions, logLevel } from "kafkajs";
import type { ConnectionOptions } from "tls";

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs?: number;
  retryableErrorCodes?: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxSuccesses?: number;
}

export interface EgressRule {
  host: string;
  ports?: number[];
  protocols?: string[];
}

export interface EgressProfile {
  name: string;
  allow: EgressRule[];
  defaultAction?: "deny" | "allow";
}

export interface DlqConfig {
  brokers: string[];
  topic: string;
  clientId?: string;
  ssl?: boolean | ConnectionOptions;
  sasl?: SASLOptions;
  logLevel?: logLevel;
}

export interface AdapterExecutionContext {
  attempt: number;
  signal: AbortSignal;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface AdapterExecutionRequest<T = unknown> {
  adapterId: string;
  operation: string;
  execute: (ctx: AdapterExecutionContext) => Promise<T>;
  payload?: unknown;
  timeoutMs?: number;
  idempotencyKey?: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export interface AdapterExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  attempts: number;
  durationMs: number;
  error?: Error;
  fromCache: boolean;
}

export interface DlqEvent {
  adapterId: string;
  operation: string;
  idempotencyKey?: string;
  error: string;
  payload?: unknown;
  attempts: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
  circuitState?: "open" | "closed" | "half-open";
}

export interface DlqPublisher {
  publish(event: DlqEvent): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface ExecutorMetrics {
  successTotal: number;
  errorTotal: number;
  retryTotal: number;
  dlqTotal: number;
}

export interface ExecutorConfig {
  defaultTimeoutMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  egressProfile?: EgressProfile;
  dlq?: DlqConfig;
  idempotencyTtlMs?: number;
  dlqPublisher?: DlqPublisher;
  meterName?: string;
}
