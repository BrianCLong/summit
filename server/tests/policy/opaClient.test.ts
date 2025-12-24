import { jest } from '@jest/globals';
import fetch from 'node-fetch';

import { clearOpaDecisionCache, opaAllow } from '../../src/policy/opaClient';

jest.mock('node-fetch', () => jest.fn());

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

const buildResponse = (body: any, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
  } as any);

describe('opaClient', () => {
  const originalFailOpen = process.env.OPA_FAIL_OPEN;
  const originalDebug = process.env.POLICY_DEBUG;

  beforeEach(() => {
    clearOpaDecisionCache();
    mockedFetch.mockReset();
    process.env.OPA_FAIL_OPEN = 'false';
    process.env.POLICY_DEBUG = '0';
  });

  afterAll(() => {
    process.env.OPA_FAIL_OPEN = originalFailOpen;
    process.env.POLICY_DEBUG = originalDebug;
  });

  it('caches decisions keyed by input and path', async () => {
    mockedFetch.mockResolvedValue(buildResponse({ result: { allow: true } }));

    const input = { action: 'read', tenant: 't1', user: { id: 'u1' }, resource: '/case/1' };
    const first = await opaAllow('test/allow', input, { cacheTtlMs: 10_000 });
    const second = await opaAllow('test/allow', input, { cacheTtlMs: 10_000 });

    expect(first.allow).toBe(true);
    expect(second.allow).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on failure with exponential backoff', async () => {
    mockedFetch
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(buildResponse({ result: { allow: true, reason: 'ok' } }));

    const result = await opaAllow(
      'test/retry',
      { action: 'read', tenant: 't1' },
      { baseBackoffMs: 0, maxRetries: 1, cacheTtlMs: 0 },
    );

    expect(result.allow).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('fails closed when retries exhausted and fail-open disabled', async () => {
    mockedFetch.mockRejectedValue(new Error('unreachable'));

    const result = await opaAllow('test/deny', { action: 'read', tenant: 't1' }, { cacheTtlMs: 0, maxRetries: 0 });
    expect(result.allow).toBe(false);
  });

  it('honors fail-open flag when enabled', async () => {
    mockedFetch.mockRejectedValue(new Error('unreachable'));
    process.env.OPA_FAIL_OPEN = 'true';

    const result = await opaAllow('test/fail-open', { action: 'read' }, { cacheTtlMs: 0, maxRetries: 0 });
    expect(result.allow).toBe(true);
    expect(result.reason).toBe('fail-open');
  });
});
