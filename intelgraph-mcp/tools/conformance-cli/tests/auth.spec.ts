import { afterEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/checks/auth';

describe('auth check', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expects 401/403 when token is absent', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 401 }));

    const out = await run({ endpoint: 'http://example.test' });

    expect(out.pass).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const options = fetchMock.mock.calls[0]?.[1] as { body?: string };
    expect(options.body).toContain('"toolClass":"echo"');
  });

  it('expects non-401/403 when token is provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );

    const out = await run({ endpoint: 'http://example.test', token: 't' });
    expect(out.pass).toBe(true);
  });
});
