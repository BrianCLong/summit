import { ToolRegistry } from './tool-registry';

export class ToolFetcher {
  constructor(private registry: ToolRegistry) {}

  getToolDefinition(id: string) {
    const tool = this.registry.tools.get(id);
    if (!tool) {
      throw new Error(`Tool not found: ${id}`);
    }
    return tool;
  }
}
