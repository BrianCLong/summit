import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { classifyError, shouldRetry, RetryClassification } from '../retryPolicy.js';

describe('RetryPolicy', () => {
  describe('classifyError', () => {
    it('should classify 4xx errors as NonRetryable', () => {
      const error = { status: 400 };
      expect(classifyError(error)).toBe(RetryClassification.NonRetryable);
    });

    it('should classify 408 as Retryable', () => {
      const error = { status: 408 };
      expect(classifyError(error)).toBe(RetryClassification.Retryable);
    });

    it('should classify 429 as Retryable', () => {
      const error = { status: 429 };
      expect(classifyError(error)).toBe(RetryClassification.Retryable);
    });

    it('should classify 5xx errors as Retryable', () => {
      const error = { status: 500 };
      expect(classifyError(error)).toBe(RetryClassification.Retryable);
    });

    it('should classify network errors as Retryable', () => {
      const error = { code: 'ECONNRESET' };
      expect(classifyError(error)).toBe(RetryClassification.Retryable);
    });

    it('should classify errors with specific messages as Retryable', () => {
      const error = { message: 'Connection timed out' };
      expect(classifyError(error)).toBe(RetryClassification.Retryable);
    });

    it('should classify unknown errors as Unknown', () => {
        const error = { message: 'Something went wrong' };
        expect(classifyError(error)).toBe(RetryClassification.Unknown);
    });
  });

  describe('shouldRetry', () => {
    it('should return true for Retryable errors', () => {
      const error = { status: 503 };
      expect(shouldRetry(error)).toBe(true);
    });

    it('should return false for NonRetryable errors', () => {
      const error = { status: 400 };
      expect(shouldRetry(error)).toBe(false);
    });

    it('should return true for Unknown errors (default safe)', () => {
      const error = { message: 'Who knows' };
      expect(shouldRetry(error)).toBe(true);
    });
  });
});
