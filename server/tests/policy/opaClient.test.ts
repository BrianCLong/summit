import fetch from 'node-fetch';
import { opaAllow } from '../../src/policy/opaClient';

type MockResponse = {
  ok: boolean;
  status: number;
  json: jest.MockedFunction<() => Promise<any>>;
};

const createResponse = (ok: boolean, status: number, result: any): MockResponse => ({
  ok,
  status,
  json: jest.fn(async () => result),
});

describe('opaClient', () => {
  const mockFetch = fetch as unknown as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns allow decision when OPA responds successfully', async () => {
    mockFetch.mockResolvedValue(
      createResponse(true, 200, { result: { allow: true, reason: 'ok' } }) as any,
    );

    const resultPromise = opaAllow('policy/path', { action: 'read' });
    await jest.runAllTimersAsync();
    const decision = await resultPromise;

    expect(decision.allow).toBe(true);
    expect(decision.reason).toBe('ok');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('policy/path'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('retries once on timeout then succeeds', async () => {
    const abortError = new Error('timeout');
    (abortError as any).name = 'AbortError';

    mockFetch
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(
        createResponse(true, 200, { result: { allow: true } }) as any,
      );

    const decisionPromise = opaAllow(
      'maestro/residency',
      { action: 'read' },
      { timeoutMs: 50, backoffMs: 0, retries: 1 },
    );

    await jest.runAllTimersAsync();
    const decision = await decisionPromise;

    expect(decision.allow).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fails closed when retries exhausted', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));

    const decisionPromise = opaAllow('policy/fail', { action: 'write' }, { retries: 0 });
    await jest.runAllTimersAsync();
    const decision = await decisionPromise;

    expect(decision.allow).toBe(false);
    expect(decision.reason).toBeDefined();
  });
});
