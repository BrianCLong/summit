import { ToolDescriptor } from '@summit/mcp-registry';

export class ToolIndex {
  private index: Map<string, ToolDescriptor[]> = new Map();

  constructor(tools: ToolDescriptor[]) {
    // Deterministic build
    const sortedTools = [...tools].sort((a, b) => {
      const cmp = a.serverId.localeCompare(b.serverId);
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name);
    });

    for (const tool of sortedTools) {
      for (const tag of tool.capabilityTags) {
        if (!this.index.has(tag)) {
          this.index.set(tag, []);
        }
        this.index.get(tag)!.push(tool);
      }
    }
  }

  getToolsByCapability(capability: string): ToolDescriptor[] {
    return this.index.get(capability) || [];
  }
}
