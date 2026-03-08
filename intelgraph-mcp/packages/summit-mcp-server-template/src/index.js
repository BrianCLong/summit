"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitMCPServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const zod_1 = require("zod");
const zod_to_json_schema_1 = require("zod-to-json-schema");
class SummitMCPServer {
    server;
    tools = new Map();
    constructor(name, version) {
        this.server = new index_js_1.Server({ name, version }, { capabilities: { tools: {} } });
        this.setupHandlers();
    }
    /**
     * Registers a tool with the server.
     * Enforces flat typed arguments via Zod and Summit-grade metadata.
     */
    tool(name, description, shape, handler, governance = {}) {
        // Enforce naming convention: service_action_resource
        if (!/^[a-z0-9]+_[a-z0-9]+_[a-z0-9_]+$/.test(name)) {
            console.warn(`Warning: Tool name "${name}" does not follow the Summit naming convention {service}_{action}_{resource}`);
        }
        const schema = zod_1.z.object(shape);
        this.tools.set(name, { description, schema, handler, governance });
    }
    setupHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
            tools: Array.from(this.tools.entries()).map(([name, { description, schema }]) => ({
                name,
                description,
                inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(schema),
            })),
        }));
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
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
            }
            catch (error) {
                const duration = Date.now() - startTime;
                console.error(`[Telemetry] Tool: ${toolName} | Status: error | Latency: ${duration}ms | Error: ${error instanceof Error ? error.message : "unknown"}`);
                if (error instanceof zod_1.z.ZodError) {
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
    evaluatePolicy(name, governance) {
        if (governance.destructive && process.env.SUMMIT_SAFE_MODE === "1") {
            throw new Error(`Execution of destructive tool "${name}" is blocked in SAFE_MODE. Ensure you have explicit authorization.`);
        }
        // Placeholder for more advanced policy evaluation
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error(`${this.server.getName()} MCP server running on stdio`);
    }
}
exports.SummitMCPServer = SummitMCPServer;
// Re-export types
__exportStar(require("./types.js"), exports);
