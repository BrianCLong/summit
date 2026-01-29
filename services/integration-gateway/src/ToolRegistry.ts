import { Connector, ToolDefinition } from '../../../packages/connector-sdk/src';

export class ToolRegistry {
  private connectors: Map<string, Connector> = new Map();
  private tools: Map<string, { connector: Connector; definition: ToolDefinition }> = new Map();

  async registerConnector(connector: Connector) {
    this.connectors.set(connector.manifest.id, connector);

    if (connector.getTools) {
      const tools = await connector.getTools();
      for (const tool of tools) {
        this.tools.set(tool.name, { connector, definition: tool });
      }
    }
  }

  getConnectorForTool(toolName: string): Connector | undefined {
    return this.tools.get(toolName)?.connector;
  }

  getToolDefinition(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName)?.definition;
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }
}
