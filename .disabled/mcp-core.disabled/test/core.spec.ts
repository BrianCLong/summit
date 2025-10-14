import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory';
import { createMcpServer } from '../src/core.js';
import { ToolRegistry } from '../src/registry.js';

describe('createMcpServer', () => {
  it('starts an MCP server with health tool available', async () => {
    const [, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = await createMcpServer({
      serverName: 'test-mcp',
      version: '0.0.1',
      transport: 'stdio',
      registries: { tools: new ToolRegistry() },
      transportFactory: () => serverTransport
    });

    expect(server).toBeDefined();
    await server.shutdown();
  });
});
