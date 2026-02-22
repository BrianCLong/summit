import type { ToolDefinition, ToolIndexEntry, ToolSchema } from '../types.js';
import type { JsonValue } from '../utils/stable-json.js';
import { hashJson } from '../utils/hash.js';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition<any, any>>;
  private aliases: Map<string, string>;

  constructor(tools: ToolDefinition<any, any>[]) {
    this.tools = new Map(tools.map((tool) => [tool.schema.id, tool]));
    this.aliases = new Map();
    tools.forEach((tool) => {
      tool.schema.aliases?.forEach((alias) => {
        this.aliases.set(alias, tool.schema.id);
      });
    });
  }

  listIndex(): ToolIndexEntry[] {
    return Array.from(this.tools.values())
      .map((tool) => this.toIndexEntry(tool.schema))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  getSchema(toolId: string): ToolSchema<any, any> {
    const resolvedId = this.aliases.get(toolId) ?? toolId;
    const tool = this.tools.get(resolvedId);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolId}`);
    }
    return tool.schema;
  }

  getSchemaHash(toolId: string): string {
    const schema = this.getSchema(toolId);
    return hashJson({
      id: schema.id,
      version: schema.version,
      input: schema.inputJsonSchema as JsonValue,
      output: schema.outputJsonSchema as JsonValue,
    });
  }

  getTool(toolId: string): ToolDefinition<any, any> {
    const resolvedId = this.aliases.get(toolId) ?? toolId;
    const tool = this.tools.get(resolvedId);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolId}`);
    }
    return tool;
  }

  routeTools(query: string, limit = 5): ToolIndexEntry[] {
    const normalized = query.toLowerCase();
    const scored = this.listIndex().map((tool) => {
      const haystack = [
        tool.name,
        tool.description,
        tool.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      const score = normalized
        .split(/\s+/g)
        .filter(Boolean)
        .reduce((total, token) => (haystack.includes(token) ? total + 1 : total), 0);
      return { tool, score };
    });
    return scored
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.tool.id.localeCompare(b.tool.id))
      .slice(0, limit)
      .map((entry) => entry.tool);
  }

  private toIndexEntry(schema: ToolSchema<any, any>): ToolIndexEntry {
    return {
      id: schema.id,
      name: schema.name,
      description: schema.description,
      tags: schema.tags,
      riskTier: schema.riskTier,
      requiredScopes: schema.requiredScopes,
      costHint: schema.costHint,
      version: schema.version,
      schemaHash: hashJson({
        id: schema.id,
        version: schema.version,
        input: schema.inputJsonSchema as JsonValue,
        output: schema.outputJsonSchema as JsonValue,
      }),
    };
  }
}
