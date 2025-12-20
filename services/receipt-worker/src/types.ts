export interface ReceiptJob<TPayload = unknown> {
  id: string;
  payload: TPayload;
  attempts: number;
  enqueuedAt: number;
  firstEnqueuedAt: number;
  lastError?: string;
}

export interface ReceiptWorkerConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffCapMs: number;
  pollIntervalMs: number;
}

export type ReceiptHandler<TPayload = unknown> = (
  job: ReceiptJob<TPayload>,
) => Promise<void>;
