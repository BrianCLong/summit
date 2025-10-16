export async function run(ctx: { endpoint: string; token?: string }) {
  try {
    const res = await fetch(`${ctx.endpoint}/v1/session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(ctx.token ? { authorization: `Bearer ${ctx.token}` } : {}),
      },
      body: JSON.stringify({ toolClass: 'probe' }),
    });
    const pass = res.status !== 401;
    return { name: 'auth', pass, status: res.status };
  } catch (error) {
    return { name: 'auth', pass: false, error: String(error) };
  }
}
