export async function run(_ctx: { endpoint: string; token?: string }) {
  const metaRaw = process.env.MCP_SANDBOX_METADATA;
  if (!metaRaw) {
    return {
      name: 'sandbox',
      pass: false,
      reason: 'MCP_SANDBOX_METADATA not set',
    };
  }
  try {
    const metadata = JSON.parse(metaRaw) as Record<string, string>;
    return { name: 'sandbox', pass: true, metadata };
  } catch (error) {
    return {
      name: 'sandbox',
      pass: false,
      reason: `invalid MCP_SANDBOX_METADATA: ${error}`,
    };
  }
}
