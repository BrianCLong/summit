export async function run(ctx: { endpoint: string; token?: string }) {
  const headers = ctx.token ? { Authorization: `Bearer ${ctx.token}` } : undefined;
  try {
    const [toolsRes, resourcesRes, promptsRes] = await Promise.all([
      fetch(`${ctx.endpoint}/.well-known/mcp-tools`, { headers }),
      fetch(`${ctx.endpoint}/.well-known/mcp-resources`, { headers }),
      fetch(`${ctx.endpoint}/.well-known/mcp-prompts`, { headers })
    ]);

    const pass = toolsRes.ok && resourcesRes.ok && promptsRes.ok;
    const data = pass
      ? {
          tools: await toolsRes.json(),
          resources: await resourcesRes.json(),
          prompts: await promptsRes.json()
        }
      : null;

    return {
      name: 'discovery',
      pass,
      status: {
        tools: toolsRes.status,
        resources: resourcesRes.status,
        prompts: promptsRes.status
      },
      data
    };
  } catch (error) {
    return { name: 'discovery', pass: false, error: String(error) };
  }
}
