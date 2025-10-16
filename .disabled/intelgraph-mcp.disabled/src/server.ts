import {
  createMcpServer,
  ToolRegistry,
  ResourceRegistry,
  PromptRegistry,
  graphToolkit,
} from '@intelgraph/mcp-core';

const cypher = async (_tenant: string, query: string, params?: unknown) => {
  // TODO wire to graph backend and apply tenant-scoped filtering
  return [
    {
      query,
      params: params ?? {},
      provenance: 'example',
    },
  ];
};

const registries = {
  tools: new ToolRegistry(),
  resources: new ResourceRegistry(),
  prompts: new PromptRegistry(),
};

const toolkit = graphToolkit({ cypher });
toolkit.tools.forEach((tool) => registries.tools.register(tool));
toolkit.resources.forEach((resource) =>
  registries.resources.register(resource),
);
toolkit.prompts.forEach((prompt) => registries.prompts.register(prompt));

const transport = process.env.MCP_TRANSPORT === 'http' ? 'http' : 'stdio';
const port = Number.parseInt(process.env.PORT ?? '8787', 10);

void (async () => {
  try {
    await createMcpServer({
      serverName: 'intelgraph-mcp',
      version: '0.1.0',
      transport,
      http: { port },
      jwksUrl: process.env.JWKS_URL,
      registries,
    });
  } catch (error) {
    console.error('[intelgraph-mcp] failed to start MCP server', error);
    process.exitCode = 1;
  }
})();
