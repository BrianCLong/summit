
import { ToolDefinition, ToolCallInvocation } from '../types';

export interface ExecutableTool extends ToolDefinition {
  execute(args: Record<string, unknown>, context: { tenantId: string, user?: any }): Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ExecutableTool> = new Map();

  register(tool: ExecutableTool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ExecutableTool | undefined {
    return this.tools.get(name);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
    }));
  }

  async execute(toolName: string, args: Record<string, unknown>, context: { tenantId: string, user?: any }): Promise<any> {
      const tool = this.get(toolName);
      if (!tool) {
          throw new Error(`Tool not found: ${toolName}`);
      }
      return tool.execute(args, context);
  }
}

export const toolRegistry = new ToolRegistry();
