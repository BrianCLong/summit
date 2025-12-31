// @ts-nocheck
import { BackoffPlanOptions, createDeterministicBackoff } from './backoff.js';

export interface RetryPolicyOptions {
  maxAttempts?: number;
  maxElapsedMs?: number;
  backoff?: BackoffPlanOptions;
}

export interface RetryDecision {
  retry: boolean;
  delayMs?: number;
  reason: string;
}

const DEFAULT_POLICY: Required<RetryPolicyOptions> = {
  maxAttempts: 5,
  maxElapsedMs: 60_000,
  backoff: {},
};

export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeStatus = getStatusCode(error);
  if (maybeStatus !== undefined) {
    if (maybeStatus === 429) return true;
    if (maybeStatus >= 500 && maybeStatus < 600) return true;
  }

  const code = getErrorCode(error)?.toUpperCase();
  if (code && ['ETIMEDOUT', 'ECONNRESET', 'ECONNABORTED', 'EAI_AGAIN'].includes(code)) {
    return true;
  }

  const message = getMessage(error);
  if (message) {
    const normalized = message.toLowerCase();
    if (normalized.includes('timeout') || normalized.includes('timed out')) {
      return true;
    }
  }

  return false;
}

export function createRetryPolicy(options: RetryPolicyOptions = {}) {
  const merged: Required<RetryPolicyOptions> = {
    ...DEFAULT_POLICY,
    ...options,
    backoff: { ...DEFAULT_POLICY.backoff, ...options.backoff },
  };

  const backoffStep = createDeterministicBackoff(merged.backoff);

  return {
    shouldRetry(
      error: unknown,
      attempt: number,
      elapsedMs: number,
    ): RetryDecision {
      if (attempt >= merged.maxAttempts) {
        return { retry: false, reason: 'max-attempts-exceeded' };
      }

      if (elapsedMs >= merged.maxElapsedMs) {
        return { retry: false, reason: 'max-elapsed-exceeded' };
      }

      if (!isRetryableError(error)) {
        return { retry: false, reason: 'non-retryable-error' };
      }

      const state = backoffStep();
      const delayMs = state.delays[state.delays.length - 1];
      return { retry: true, delayMs, reason: 'retryable' };
    },
  };
}

function getStatusCode(error: Record<string, unknown>): number | undefined {
  if (typeof error.status === 'number') return error.status;
  const response = error.response as Record<string, unknown> | undefined;
  if (response && typeof response.status === 'number') return response.status;
  return undefined;
}

function getErrorCode(error: Record<string, unknown>): string | undefined {
  if (typeof error.code === 'string') return error.code;
  return undefined;
}

function getMessage(error: Record<string, unknown>): string | undefined {
  if (typeof error.message === 'string') return error.message;
  return undefined;
}
