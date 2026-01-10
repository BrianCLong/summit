
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { ToolDefinition, ToolCallInvocation } from '../types.js';

export interface ExecutableTool extends ToolDefinition {
  execute(args: Record<string, unknown>, context: { tenantId: string, user?: any }): Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ExecutableTool> = new Map();
  private validators: Map<string, ValidateFunction> = new Map();
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(this.ajv);
  }

  register(tool: ExecutableTool) {
    const schemaValid = this.ajv.validateSchema(tool.inputSchema);
    if (typeof (schemaValid as Promise<unknown>)?.then === 'function' || schemaValid !== true) {
      throw new Error(`Invalid tool schema for ${tool.name}: ${this.ajv.errorsText(this.ajv.errors)}`);
    }
    if (!isClosedObjectSchema(tool.inputSchema)) {
      throw new Error(`Tool schema for ${tool.name} must be a closed object schema`);
    }
    this.validators.set(tool.name, this.ajv.compile(tool.inputSchema));
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
      const validator = this.validators.get(toolName);
      if (validator && !validator(args)) {
          throw new Error(`Tool input failed validation for ${toolName}: ${this.ajv.errorsText(validator.errors)}`);
      }
      return tool.execute(args, context);
  }
}

export const toolRegistry = new ToolRegistry();

function isClosedObjectSchema(schema: Record<string, unknown>): boolean {
  return schema.type === 'object' && schema.additionalProperties === false;
}
