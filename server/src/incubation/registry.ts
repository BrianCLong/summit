// @ts-nocheck
import { ToolRegistry } from './types.js';

type ToolFunction = (args: any) => Promise<any>;

export class SafeToolRegistry implements ToolRegistry {
  private tools: Map<string, ToolFunction> = new Map();
  private allowedTools: Set<string> = new Set();

  constructor() {
    // Initialize with some mock safe tools
    this.register('echo', async (args) => args, true);
    this.register('read_context', async () => 'This is a restricted context.', true);

    // Unsafe tool for testing
    this.register('delete_database', async () => { throw new Error('EXECUTED UNSAFE TOOL'); }, false);
  }

  register(name: string, fn: ToolFunction, isAllowed: boolean) {
    this.tools.set(name, fn);
    if (isAllowed) {
      this.allowedTools.add(name);
    }
  }

  isAllowed(toolName: string): boolean {
    return this.allowedTools.has(toolName);
  }

  async execute(toolName: string, args: any): Promise<any> {
    if (!this.tools.has(toolName)) {
      throw new Error(`Tool ${toolName} not found.`);
    }

    if (!this.isAllowed(toolName)) {
      throw new Error(`Security Violation: Tool ${toolName} is not allowed in Incubation Sandbox.`);
    }

    return this.tools.get(toolName)!(args);
  }
}
