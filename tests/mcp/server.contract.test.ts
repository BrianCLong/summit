import { McpServer } from '../../src/mcp/server.js';

describe('McpServer Contract', () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer();
  });

  it('should handle initialize request', async () => {
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" }
      }
    };

    const response = await server.handleRequest(request);
    expect(response.result.serverInfo.name).toBe("summit-mcp-server");
    expect(response.result.protocolVersion).toBe("2025-06-18");
  });

  it('should list tools', async () => {
    const request = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    };

    const response = await server.handleRequest(request);
    expect(response.result.tools).toHaveLength(3);
    expect(response.result.tools[0].name).toBe("list_projects");
  });

  it('should call list_projects tool', async () => {
    const request = {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "list_projects",
        arguments: {}
      }
    };

    const response = await server.handleRequest(request);
    expect(response.result.content[0].text).toContain("summit-core");
  });

  it('should return error for unknown method', async () => {
    const request = {
      jsonrpc: "2.0",
      id: 4,
      method: "unknown_method",
      params: {}
    };

    const response = await server.handleRequest(request);
    expect(response.error.code).toBe(-32601);
  });
});
