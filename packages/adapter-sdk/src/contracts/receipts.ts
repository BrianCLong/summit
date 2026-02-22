import type { AdapterDescriptor, AdapterRequest } from './adapter';
import type { LifecycleGuardDecision } from './guard';

export interface RetryMetadata {
  attempt: number;
  maxRetries: number;
  remaining: number;
  retryable?: boolean;
}

export interface AdapterReceipt {
  adapter: AdapterDescriptor;
  correlationId: string;
  intent: LifecycleGuardDecision['intent'];
  decision: LifecycleGuardDecision;
  digests: Record<string, string>;
  retries: RetryMetadata;
  durationMs: number;
  issuedAt: string;
  metadata?: Record<string, unknown>;
}

export type AdapterReceiptEmitter = (
  receipt: AdapterReceipt,
) => Promise<void> | void;

export interface ReceiptBuilderInput {
  adapter: AdapterDescriptor;
  request: AdapterRequest;
  decision: LifecycleGuardDecision;
  digests?: Record<string, string>;
  retries: RetryMetadata;
  durationMs: number;
  issuedAt?: string;
  metadata?: Record<string, unknown>;
}
