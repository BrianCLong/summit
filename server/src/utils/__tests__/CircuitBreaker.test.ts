import { CircuitBreaker } from '../CircuitBreaker';

jest.mock('../../config/logger', () => ({
  child: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

describe('CircuitBreaker', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('opens after consecutive failures and rejects while open', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 1000 });

    const failingCommand = async () => {
      throw new Error('boom');
    };

    await expect(breaker.execute(failingCommand)).rejects.toThrow('boom');
    await expect(breaker.execute(failingCommand)).rejects.toThrow('boom');

    expect(breaker.getState()).toBe('OPEN' as any);

    const thirdAttempt = breaker.execute(async () => 'ok');
    await expect(thirdAttempt).rejects.toThrow('CircuitBreaker: Service is currently unavailable');
  });

  it('transitions from OPEN → HALF_OPEN → CLOSED after reset timeout and successes', async () => {
    jest.useFakeTimers();

    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      resetTimeout: 100,
      p95ThresholdMs: 500
    });

    await expect(
      breaker.execute(async () => {
        throw new Error('first failure');
      })
    ).rejects.toThrow('first failure');

    expect(breaker.getState()).toBe('OPEN' as any);

    now += 150;

    const successCommand = async () => {
      now += 10;
      return 'ok';
    };

    await expect(breaker.execute(successCommand)).resolves.toBe('ok');
    expect(breaker.getState()).toBe('HALF_OPEN' as any);

    await expect(breaker.execute(successCommand)).resolves.toBe('ok');
    expect(breaker.getState()).toBe('CLOSED' as any);
  });

  it('opens when P95 latency breaches the configured threshold', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const breaker = new CircuitBreaker({
      failureThreshold: 10,
      p95ThresholdMs: 50,
      resetTimeout: 3000
    });

    const slowCommand = async () => {
      now += 120;
      return 'slow';
    };

    for (let i = 0; i < 4; i++) {
      await expect(breaker.execute(slowCommand)).resolves.toBe('slow');
      expect(breaker.getState()).toBe('CLOSED' as any);
    }

    await expect(breaker.execute(slowCommand)).rejects.toThrow('CircuitBreaker: Service is currently unavailable');
    expect(breaker.getState()).toBe('OPEN' as any);
  });
});
