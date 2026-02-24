export async function run(ctx: { endpoint: string; token?: string }) {
  const cases = await Promise.all([
    send(ctx, '{ not json }', 'malformed'),
    send(ctx, { jsonrpc: '2.0', id: 1, method: 'unknown' }, 'unknown-method'),
    send(
      ctx,
      { jsonrpc: '2.0', id: 2, method: 'mcp.ping', params: 123 },
      'invalid-params',
    ),
    send(ctx, { jsonrpc: '2.0', id: 3, method: 'mcp.ping' }, 'ping'),
    send(ctx, { jsonrpc: '2.0', id: 3, method: 'mcp.ping' }, 'id-reuse'),
    send(
      ctx,
      [{ jsonrpc: '2.0', id: 1, method: 'mcp.ping' }],
      'batch-unsupported',
    ),
  ]);
  const byName = new Map(cases.map((check) => [check.name, check]));
  const malformed = byName.get('malformed');
  const unknown = byName.get('unknown-method');
  const invalidParams = byName.get('invalid-params');
  const ping = byName.get('ping');
  const batchUnsupported = byName.get('batch-unsupported');
  const idReuse = byName.get('id-reuse');

  const pass =
    Boolean(malformed && malformed.status === 400) &&
    Boolean(unknown && unknown.status === 400 && unknown.errorCode === -32601) &&
    Boolean(
      invalidParams &&
        invalidParams.status === 400 &&
        invalidParams.errorCode === -32602,
    ) &&
    Boolean(
      ping &&
        ping.status === 200 &&
        ping.result &&
        typeof ping.result === 'object' &&
        (ping.result as { ok?: boolean }).ok === true,
    ) &&
    Boolean(idReuse && idReuse.status === 200) &&
    Boolean(
      batchUnsupported &&
        batchUnsupported.status === 501 &&
        batchUnsupported.errorCode === -32600,
    );
  return { name: 'jsonrpc-negatives', pass, details: cases };
}

async function send(
  ctx: { endpoint: string; token?: string },
  payload: unknown,
  name: string,
) {
  try {
    const body =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    const res = await fetch(`${ctx.endpoint}/jsonrpc`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {}),
      },
      body,
    });
    let responseBody: unknown = null;
    try {
      responseBody = await res.json();
    } catch {
      responseBody = null;
    }
    const parsed = parseJsonRpcResult(responseBody);
    return {
      name,
      status: res.status,
      errorCode: parsed.errorCode,
      result: parsed.result,
    };
  } catch (error) {
    return { name, status: 0, error: String(error) };
  }
}

function parseJsonRpcResult(payload: unknown): {
  errorCode?: number;
  result?: unknown;
} {
  if (!payload || typeof payload !== 'object') return {};
  if ('error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      if (typeof code === 'number') {
        return { errorCode: code };
      }
    }
  }
  if ('result' in payload) {
    return { result: (payload as { result?: unknown }).result };
  }
  return {};
}
