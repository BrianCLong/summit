import type { AdapterReceiptEmitter } from './receipts';
import { AdapterLifecycleStage } from './lifecycle';
import type { PolicyDecision, PolicyEvaluator } from './policy';

export interface AdapterDescriptor {
  name: string;
  version: string;
  owner?: string;
  capabilities?: string[];
}

export interface AdapterRequest<TPayload = unknown> {
  correlationId: string;
  payload: TPayload;
  digests?: Record<string, string>;
  metadata?: Record<string, unknown>;
  attempt?: number;
  stage?: AdapterLifecycleStage;
}

export enum AdapterOutcome {
  Success = 'success',
  Rejected = 'rejected',
  Failed = 'failed',
}

export interface AdapterError {
  code: string;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export interface AdapterResponse<TResult = unknown> {
  outcome: AdapterOutcome;
  result?: TResult;
  digests?: Record<string, string>;
  error?: AdapterError;
  policy?: PolicyDecision;
  durationMs?: number;
}

export interface AdapterLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void;
}

export interface AdapterContext {
  logger: AdapterLogger;
  now?: () => number;
  policy?: PolicyEvaluator;
  emitReceipt?: AdapterReceiptEmitter;
  stage?: AdapterLifecycleStage;
  attributes?: Record<string, unknown>;
}

export interface Adapter<TPayload = unknown, TResult = unknown> {
  descriptor: AdapterDescriptor;
  execute(
    request: AdapterRequest<TPayload>,
    context: AdapterContext,
  ): Promise<AdapterResponse<TResult>>;
}
