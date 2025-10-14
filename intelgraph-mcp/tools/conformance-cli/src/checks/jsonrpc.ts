export async function run(ctx: { endpoint: string; token?: string }) {
  const cases = await Promise.all([
    send(ctx, '{ not json }', 'malformed'),
    send(ctx, { jsonrpc: '2.0', id: 1, method: 'unknown' }, 'unknown-method'),
    send(ctx, { jsonrpc: '2.0', id: 2, method: 'mcp.ping', params: 123 }, 'invalid-params'),
    send(ctx, { jsonrpc: '2.0', id: 3, method: 'mcp.ping' }, 'ping'),
    send(ctx, { jsonrpc: '2.0', id: 3, method: 'mcp.ping' }, 'id-reuse'),
    send(ctx, [{ jsonrpc: '2.0', id: 1, method: 'mcp.ping' }], 'batch-unsupported')
  ]);
  const pass = cases.every((c) => [0, 200, 400, 501].includes(c.status));
  return { name: 'jsonrpc-negatives', pass, details: cases };
}

async function send(ctx: { endpoint: string; token?: string }, payload: unknown, name: string) {
  try {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const res = await fetch(`${ctx.endpoint}/jsonrpc`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {})
      },
      body
    });
    return { name, status: res.status };
  } catch (error) {
    return { name, status: 0, error: String(error) };
  }
}
