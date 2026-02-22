import { McpInitializeResult, McpListToolsResult, McpCallToolResult } from './types.js';
import { tools, handleCallTool } from './tools/index.js';
import { McpInitializeRequestSchema, McpCallToolRequestSchema } from './schema/index.js';

export class McpServer {
  private name = "summit-mcp-server";
  private version = "1.0.0";

  async handleRequest(message: any): Promise<any> {
    const { method, params, id } = message;

    try {
      switch (method) {
        case "initialize": {
          const validated = McpInitializeRequestSchema.parse(params);
          const result: McpInitializeResult = {
            protocolVersion: validated.protocolVersion,
            capabilities: {
              tools: { listChanged: false }
            },
            serverInfo: {
              name: this.name,
              version: this.version
            }
          };
          return { jsonrpc: "2.0", id, result };
        }

        case "tools/list": {
          const result: McpListToolsResult = { tools };
          return { jsonrpc: "2.0", id, result };
        }

        case "tools/call": {
          const validated = McpCallToolRequestSchema.parse(params);
          const result: McpCallToolResult = await handleCallTool(validated.name, validated.arguments);
          return { jsonrpc: "2.0", id, result };
        }

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Method not found: ${method}` }
          };
      }
    } catch (error: any) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: error.message || "Internal error" }
      };
    }
  }

  async start() {
    console.error(`${this.name} started`);
  }
}
