export enum RetryClassification {
  Retryable = 'RETRYABLE',
  NonRetryable = 'NON_RETRYABLE',
  Unknown = 'UNKNOWN',
}

/**
 * Classifies an error to determine if the operation should be retried.
 *
 * @param error - The error object to classify
 * @returns The classification of the error
 */
export function classifyError(error: any): RetryClassification {
  if (!error) {
    return RetryClassification.Unknown;
  }

  // Check for HTTP status codes in the error object (common in Axios/Express errors)
  const status = error.status || error.statusCode || error.response?.status;

  if (typeof status === 'number') {
    // 4xx Client Errors are generally non-retryable (except 408 Request Timeout, 429 Too Many Requests)
    if (status >= 400 && status < 500) {
      if (status === 408 || status === 429) {
        return RetryClassification.Retryable;
      }
      return RetryClassification.NonRetryable;
    }

    // 5xx Server Errors are generally retryable
    if (status >= 500 && status < 600) {
      return RetryClassification.Retryable;
    }
  }

  // Check for common network error codes
  const code = error.code || error.syscall;
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'ENOTFOUND',
    'EPIPE',
  ];

  if (retryableCodes.includes(code)) {
    return RetryClassification.Retryable;
  }

  // Check error message for specific patterns if needed
  const message = error.message || '';
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('deadlock')
  ) {
    return RetryClassification.Retryable;
  }

  // Default to Unknown/Retryable depending on strategy, but here we'll stick to Unknown
  // or maybe default to Retryable if we want to be safe, but "Unknown" lets the caller decide default.
  // However, usually if it's not explicitly non-retryable, we might want to retry?
  // Let's return Unknown for now.
  return RetryClassification.Unknown;
}

/**
 * Helper to determine if an error should be retried based on classification.
 * @param error - The error to check
 * @returns true if the error is definitely retryable, or unknown (default safe), false if definitely non-retryable.
 */
export function shouldRetry(error: any): boolean {
  const classification = classifyError(error);
  return classification !== RetryClassification.NonRetryable;
}
