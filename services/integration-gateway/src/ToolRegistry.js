"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
class ToolRegistry {
    connectors = new Map();
    tools = new Map();
    async registerConnector(connector) {
        this.connectors.set(connector.manifest.id, connector);
        if (connector.getTools) {
            const tools = await connector.getTools();
            for (const tool of tools) {
                this.tools.set(tool.name, { connector, definition: tool });
            }
        }
    }
    getConnectorForTool(toolName) {
        return this.tools.get(toolName)?.connector;
    }
    getToolDefinition(toolName) {
        return this.tools.get(toolName)?.definition;
    }
    getAllTools() {
        return Array.from(this.tools.values()).map(t => t.definition);
    }
}
exports.ToolRegistry = ToolRegistry;
