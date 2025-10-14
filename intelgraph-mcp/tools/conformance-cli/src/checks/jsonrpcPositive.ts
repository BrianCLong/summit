export async function run(ctx: { endpoint: string; token?: string }) {
  try {
    const res = await fetch(`${ctx.endpoint}/jsonrpc`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {})
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'echo',
        params: { toolClass: 'echo', args: { demo: true } }
      })
    });
    const ok = res.ok;
    let result: unknown = null;
    if (ok) {
      result = await res.json();
    }
    return { name: 'jsonrpc-positive', pass: ok, result, status: res.status };
  } catch (error) {
    return { name: 'jsonrpc-positive', pass: false, error: String(error) };
  }
}
