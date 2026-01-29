import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolGovernance, ToolResponse } from "./types.js";

export class SummitMCPServer {
  private server: Server;
  private tools: Map<string, {
    description: string;
    schema: z.ZodObject<any>;
    handler: (args: any) => Promise<ToolResponse>;
    governance: ToolGovernance;
  }> = new Map();

  constructor(name: string, version: string) {
    this.server = new Server(
      { name, version },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  /**
   * Registers a tool with the server.
   * Enforces flat typed arguments via Zod and Summit-grade metadata.
   */
  public tool<T extends z.ZodRawShape>(
    name: string,
    description: string,
    shape: T,
    handler: (args: z.infer<z.ZodObject<T>>) => Promise<ToolResponse>,
    governance: ToolGovernance = {}
  ) {
    // Enforce naming convention: service_action_resource
    if (!/^[a-z0-9]+_[a-z0-9]+_[a-z0-9_]+$/.test(name)) {
      console.warn(`Warning: Tool name "${name}" does not follow the Summit naming convention {service}_{action}_{resource}`);
    }

    const schema = z.object(shape);
    this.tools.set(name, { description, schema, handler, governance });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.entries()).map(([name, { description, schema }]) => ({
        name,
        description,
        inputSchema: zodToJsonSchema(schema),
      })),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.tools.get(request.params.name);
      if (!tool) {
        throw new Error(`Tool not found: ${request.params.name}`);
      }

      const startTime = Date.now();
      const toolName = request.params.name;

      try {
        // Governance Check (Centralized Evaluator Hook)
        this.evaluatePolicy(toolName, tool.governance);

        const args = tool.schema.parse(request.params.arguments);
        const result = await tool.handler(args);

        const duration = Date.now() - startTime;
        const payloadSize = JSON.stringify(result).length;

        // Telemetry Logging
        console.error(`[Telemetry] Tool: ${toolName} | Status: success | Latency: ${duration}ms | Payload: ${payloadSize} bytes`);

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[Telemetry] Tool: ${toolName} | Status: error | Latency: ${duration}ms | Error: ${error instanceof Error ? error.message : "unknown"}`);
        if (error instanceof z.ZodError) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}. Please provide the correct flat typed arguments.`
            }],
          };
        }
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}. If this persists, try a different approach.`
          }],
        };
      }
    });
  }

  /**
   * Evaluates governance policy before tool execution.
   * Can be extended to call external OPA/ABAC engines.
   */
  private evaluatePolicy(name: string, governance: ToolGovernance) {
    if (governance.destructive && process.env.SUMMIT_SAFE_MODE === "1") {
      throw new Error(`Execution of destructive tool "${name}" is blocked in SAFE_MODE. Ensure you have explicit authorization.`);
    }
    // Placeholder for more advanced policy evaluation
  }

  public async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${this.server.getName()} MCP server running on stdio`);
  }
}

// Re-export types
export * from "./types.js";
