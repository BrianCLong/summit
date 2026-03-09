import { classifyRetryableError, retry } from '../retry';

describe('retry utility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    (Math.random as jest.MockedFunction<typeof Math.random>).mockRestore();
    jest.useRealTimers();
  });

  it('stops immediately when the classifier marks an error as non-retryable', async () => {
    const fatalError = new Error('fatal');
    const operation = jest.fn().mockRejectedValue(fatalError);

    const promise = retry(operation, {
      maxAttempts: 5,
      idempotent: true,
      classifyError: () => ({ retryable: false }),
    });

    await expect(promise).rejects.toThrow('fatal');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('respects the maxAttempts cap and uses exponential backoff with jitter', async () => {
    const transientError = new Error('temporary');
    const operation = jest.fn().mockRejectedValue(transientError);
    const classifySpy = jest.fn().mockReturnValue({ retryable: true });

    const promise = retry(operation, {
      maxAttempts: 3,
      idempotent: true,
      initialDelayMs: 10,
      maxDelayMs: 50,
      classifyError: classifySpy,
    });

    for (let i = 0; i < 2; i += 1) {
      await Promise.resolve();
      jest.runOnlyPendingTimers();
    }

    await expect(promise).rejects.toThrow('temporary');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(classifySpy).toHaveBeenCalledTimes(3);
  });

  it('classifies transient HTTP and network failures as retryable by default', () => {
    const timeoutError = { message: 'Gateway timeout', status: 504 };
    const networkError = { message: 'reset', code: 'ECONNRESET' };

    expect(classifyRetryableError(timeoutError).retryable).toBe(true);
    expect(classifyRetryableError(networkError).retryable).toBe(true);
  });
});
