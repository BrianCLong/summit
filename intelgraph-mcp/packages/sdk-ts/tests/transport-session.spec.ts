import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, Headers } from 'undici';
import { HttpJsonRpcSession } from '../src/transports/http-jsonrpc-session';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('HttpJsonRpcSession', () => {
  it('sends and receives JSON-RPC frames with metadata', async () => {
    const headers = new Headers({
      'x-ig-policy-receipt': '{"hash":"abc"}',
      'x-ig-transcript-hash': 'tx123',
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, result: { ok: true } }),
        { status: 200, headers },
      ),
    );
    // @ts-expect-error test override
    global.fetch = fetchMock;

    const session = new HttpJsonRpcSession('http://localhost:8080');
    session.setMetadata({ authorization: 'Bearer token' });
    session.setDeadline(500);
    await session.connect();
    await session.send({ method: 'mcp.ping' });
    const response = await session.recv();

    expect(response.result).toEqual({ ok: true });
    expect(response.metadata?.policy_receipt).toContain('hash');
    expect(response.metadata?.transcript_hash).toBe('tx123');
  });
});
