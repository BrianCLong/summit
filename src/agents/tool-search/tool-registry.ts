export interface SummitTool {
  id: string;
  description: string;
  schema: object;
}

export class ToolRegistry {
  public tools = new Map<string, SummitTool>();

  register(tool: SummitTool) {
    this.tools.set(tool.id, tool);
  }

  getIndex() {
    return Array.from(this.tools.values()).map(t => ({
      id: t.id,
      description: t.description
    }));
  }
}
