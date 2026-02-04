import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateErrorFingerprint,
  categorizeError,
  reportError,
  ErrorCategory,
} from '../metrics';

describe('generateErrorFingerprint', () => {
  it('generates consistent fingerprints for identical errors', () => {
    const error1 = new Error('Test error');
    error1.stack = 'Error: Test error\n  at test.js:10:15\n  at run.js:5:20';

    const error2 = new Error('Test error');
    error2.stack = 'Error: Test error\n  at test.js:10:15\n  at run.js:5:20';

    const fingerprint1 = generateErrorFingerprint(error1);
    const fingerprint2 = generateErrorFingerprint(error2);

    expect(fingerprint1).toBe(fingerprint2);
  });

  it('generates different fingerprints for different errors', () => {
    const error1 = new Error('Test error A');
    const error2 = new Error('Test error B');

    const fingerprint1 = generateErrorFingerprint(error1);
    const fingerprint2 = generateErrorFingerprint(error2);

    expect(fingerprint1).not.toBe(fingerprint2);
  });

  it('normalizes line and column numbers', () => {
    const error1 = new Error('Test error');
    error1.stack = 'Error: Test error\n  at test.js:10:15';

    const error2 = new Error('Test error');
    error2.stack = 'Error: Test error\n  at test.js:25:30';

    const fingerprint1 = generateErrorFingerprint(error1);
    const fingerprint2 = generateErrorFingerprint(error2);

    // Should be the same since line numbers are normalized
    expect(fingerprint1).toBe(fingerprint2);
  });

  it('normalizes numeric values in error messages', () => {
    const error1 = new Error('Failed to load 5 items');
    error1.stack = 'Error: Failed to load 5 items\n  at test.js:10:15';

    const error2 = new Error('Failed to load 10 items');
    error2.stack = 'Error: Failed to load 10 items\n  at test.js:10:15';

    const fingerprint1 = generateErrorFingerprint(error1);
    const fingerprint2 = generateErrorFingerprint(error2);

    // Should be the same since numbers are normalized
    expect(fingerprint1).toBe(fingerprint2);
  });

  it('returns a valid hex string', () => {
    const error = new Error('Test error');
    const fingerprint = generateErrorFingerprint(error);

    expect(fingerprint).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('categorizeError', () => {
  it('categorizes network errors', () => {
    const error = new Error('Network request failed');
    expect(categorizeError(error)).toBe('network');

    const fetchError = new Error('Failed to fetch');
    expect(categorizeError(fetchError)).toBe('network');

    const networkError = new Error('NetworkError: timeout');
    expect(categorizeError(networkError)).toBe('network');
  });

  it('categorizes data fetch errors', () => {
    const error = new Error('GraphQL query failed');
    expect(categorizeError(error)).toBe('data_fetch');

    const loadingError = new Error('Loading data failed');
    expect(categorizeError(loadingError)).toBe('data_fetch');
  });

  it('categorizes mutation errors', () => {
    const error = new Error('Mutation failed to execute');
    expect(categorizeError(error)).toBe('mutation');

    const updateError = new Error('Failed to update record');
    expect(categorizeError(updateError)).toBe('mutation');

    const saveError = new Error('Could not save changes');
    expect(categorizeError(saveError)).toBe('mutation');
  });

  it('categorizes auth errors', () => {
    const error = new Error('Authentication failed');
    expect(categorizeError(error)).toBe('auth');

    const unAuthError = new Error('Unauthorized access');
    expect(categorizeError(unAuthError)).toBe('auth');

    const forbiddenError = new Error('Forbidden resource');
    expect(categorizeError(forbiddenError)).toBe('auth');
  });

  it('categorizes validation errors', () => {
    const error = new Error('Validation error: email is required');
    expect(categorizeError(error)).toBe('validation');

    const invalidError = new Error('Invalid input provided');
    expect(categorizeError(invalidError)).toBe('validation');
  });

  it('categorizes render errors when errorInfo is provided', () => {
    const error = new Error('Cannot read property of undefined');
    const errorInfo = {
      componentStack: 'at Component\n  at App',
    };

    expect(categorizeError(error, errorInfo)).toBe('render');
  });

  it('returns unknown for uncategorized errors', () => {
    const error = new Error('Something random happened');
    expect(categorizeError(error)).toBe('unknown');
  });

  it('is case-insensitive', () => {
    const error = new Error('NETWORK REQUEST FAILED');
    expect(categorizeError(error)).toBe('network');
  });
});

describe('reportError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response)
    );
  });

  it('sends error data to telemetry endpoint', async () => {
    const error = new Error('Test error');
    const errorInfo = { componentStack: 'at Component' };

    await reportError(error, errorInfo, 'high');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/monitoring/telemetry/events',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('includes error fingerprint and category', async () => {
    const error = new Error('Test error');
    await reportError(error, undefined, 'high');

    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body.labels).toHaveProperty('fingerprint');
    expect(body.labels).toHaveProperty('category');
  });

  it('includes additional context', async () => {
    const error = new Error('Test error');
    const context = { userId: '123', feature: 'dashboard' };

    await reportError(error, undefined, 'high', context);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body.payload).toMatchObject({
      userId: '123',
      feature: 'dashboard',
    });
  });

  it('handles fetch failures gracefully', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await reportError(new Error('Test error'), undefined, 'high');

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to report error:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
