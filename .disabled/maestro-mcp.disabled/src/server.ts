import {
  createMcpServer,
  ToolRegistry,
  orchestratorToolkit,
} from '@intelgraph/mcp-core';

const registries = {
  tools: new ToolRegistry(),
};

const toolkit = orchestratorToolkit({
  runJob: async (tenantId, jobId, params) => ({
    runId: `${tenantId}:${jobId}:${Date.now()}`,
    metadata: params ?? {},
  }),
  jobStatus: async (_tenantId, runId) => ({
    status: runId.endsWith('7') ? 'succeeded' : 'running',
  }),
});

toolkit.tools.forEach((tool) => registries.tools.register(tool));

const transport = process.env.MCP_TRANSPORT === 'http' ? 'http' : 'stdio';
const port = Number.parseInt(process.env.PORT ?? '8989', 10);

void (async () => {
  try {
    await createMcpServer({
      serverName: 'maestro-mcp',
      version: '0.1.0',
      transport,
      http: { port },
      jwksUrl: process.env.JWKS_URL,
      registries,
    });
  } catch (error) {
    console.error('[maestro-mcp] failed to start MCP server', error);
    process.exitCode = 1;
  }
})();
