"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = exports.ToolRegistry = void 0;
class ToolRegistry {
    tools = new Map();
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    get(name) {
        return this.tools.get(name);
    }
    getDefinitions() {
        return Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
        }));
    }
    async execute(toolName, args, context) {
        const tool = this.get(toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }
        return tool.execute(args, context);
    }
}
exports.ToolRegistry = ToolRegistry;
exports.toolRegistry = new ToolRegistry();
