import { mapErrorToResponse, type ErrorResponse } from './errors';

export type RetryClassification = {
  retryable: boolean;
  reason?: string;
  transient?: boolean;
  mappedError?: ErrorResponse;
};

export type RetryClassifier = (error: unknown) => RetryClassification;

export interface RetryOptions {
  /**
   * Maximum attempts including the initial call.
   */
  maxAttempts: number;
  /**
   * Whether the operation is idempotent. Retries are only permitted when this is true.
   */
  idempotent: boolean;
  /**
   * Initial backoff delay in milliseconds.
   */
  initialDelayMs?: number;
  /**
   * Maximum backoff delay in milliseconds.
   */
  maxDelayMs?: number;
  /**
   * Custom classifier for retryability decisions.
   */
  classifyError?: RetryClassifier;
  /**
   * Optional AbortSignal to cancel in-flight retries.
   */
  signal?: AbortSignal;
  /**
   * Hook fired after each failed attempt before sleeping.
   */
  onAttempt?: (info: { attempt: number; error: unknown; nextDelayMs: number }) => void;
}

const DEFAULT_INITIAL_DELAY_MS = 100;
const DEFAULT_MAX_DELAY_MS = 10_000;

function sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timer = setTimeout(resolve, delayMs);

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

function computeBackoff(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
  const cappedBase = Math.min(maxDelayMs, initialDelayMs * 2 ** (attempt - 1));
  const jittered = Math.random() * cappedBase; // full jitter
  return Math.max(0, Math.min(maxDelayMs, Math.round(jittered)));
}

const transientNetworkCodes = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'EAI_AGAIN',
]);

export const classifyRetryableError: RetryClassifier = (error: unknown): RetryClassification => {
  const mappedError = mapErrorToResponse(error);
  const status = mappedError.httpStatus;

  if ((error as any)?.retryable === false || (error as any)?.nonRetryable === true) {
    return { retryable: false, reason: 'Explicitly marked non-retryable', mappedError };
  }

  const code = (error as any)?.code;
  if (typeof code === 'string' && transientNetworkCodes.has(code)) {
    return { retryable: true, transient: true, reason: `Transient network error (${code})`, mappedError };
  }

  if (status === 408 || status === 429 || (status >= 500 && status < 600)) {
    return { retryable: true, transient: true, reason: `HTTP ${status} is retryable`, mappedError };
  }

  return { retryable: false, reason: mappedError.code, mappedError };
};

export async function retry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const {
    maxAttempts,
    idempotent,
    initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    classifyError = classifyRetryableError,
    signal,
    onAttempt,
  } = options;

  if (maxAttempts < 1) {
    throw new Error('maxAttempts must be at least 1');
  }

  if (!idempotent && maxAttempts > 1) {
    throw new Error('Retries are disabled for non-idempotent operations');
  }

  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      return await operation();
    } catch (error) {
      const classification = classifyError(error);
      const shouldRetry = classification.retryable && attempt < maxAttempts;

      if (!shouldRetry) {
        throw error;
      }

      const nextDelay = computeBackoff(attempt, initialDelayMs, maxDelayMs);
      onAttempt?.({ attempt, error, nextDelayMs: nextDelay });
      await sleep(nextDelay, signal);
    }
  }

  // This point should not be reachable due to the throw above.
  throw new Error('Retry attempts exhausted');
}
