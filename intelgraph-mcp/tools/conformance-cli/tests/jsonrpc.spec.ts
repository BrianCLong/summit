import { afterEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/checks/jsonrpc';

describe('jsonrpc negative check', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes when server returns expected negative-case semantics', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const rawBody = String(init?.body ?? '');
      if (rawBody === '{ not json }') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32600, message: 'Invalid Request' },
          }),
          { status: 400 },
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = null;
      }

      if (Array.isArray(payload)) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32600, message: 'Batch not supported' },
          }),
          { status: 501 },
        );
      }

      const req = payload as {
        id?: number;
        method?: string;
        params?: unknown;
      };

      if (req.method === 'unknown') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: req.id ?? null,
            error: { code: -32601, message: 'Method not found' },
          }),
          { status: 400 },
        );
      }

      if (req.method === 'mcp.ping' && req.params === 123) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: req.id ?? null,
            error: { code: -32602, message: 'Invalid params' },
          }),
          { status: 400 },
        );
      }

      if (req.method === 'mcp.ping') {
        return new Response(
          JSON.stringify({ jsonrpc: '2.0', id: req.id ?? null, result: { ok: true } }),
          { status: 200 },
        );
      }

      return new Response('{}', { status: 500 });
    });

    const out = await run({ endpoint: 'http://example.test' });
    expect(out.pass).toBe(true);
  });
});
