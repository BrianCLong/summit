import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

export const createMcpServer = () => {
  const server = new McpServer({
    name: "IntelGraph MCP",
    version: "1.0.0"
  });
  return server;
};

// Placeholder for future implementation
export const connectTransport = async (server: any) => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
};
