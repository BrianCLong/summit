import { createHash } from 'crypto';
import { McpTool } from './types.js';

/**
 * Recursively stringifies an object with sorted keys to ensure deterministic output.
 */
function stableStringify(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as object).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k])).join(',') + '}';
}

/**
 * Generates a stable, deterministic ID for a tool based on its name and input schema.
 * Note: Does NOT include description in the hash to allow for docs updates without breaking IDs.
 * Format: "tool:<name>:<sha256(inputSchema)[:12]>"
 */
export function stableToolId(tool: McpTool): string {
  // We use the stable stringification of the inputSchema to ensure that
  // functionally identical tools get the same ID, regardless of key order.
  const stableSchema = stableStringify(tool.inputSchema);
  const hash = createHash('sha256').update(stableSchema).digest('hex').substring(0, 12);
  return `tool:${tool.name}:${hash}`;
}

export interface CatalogEntry {
  id: string; // The stable ID
  tool: McpTool;
  serverId?: string;
}

/**
 * A registry of available tools, indexed by their stable ID.
 */
export class ToolCatalog {
  private tools: Map<string, CatalogEntry> = new Map();

  /**
   * Add a tool to the catalog. Returns the generated stable ID.
   */
  addTool(tool: McpTool, serverId?: string): string {
    const id = stableToolId(tool);
    this.tools.set(id, { id, tool, serverId });
    return id;
  }

  /**
   * Retrieve a tool by its stable ID.
   */
  getTool(id: string): CatalogEntry | undefined {
    return this.tools.get(id);
  }

  /**
   * List all tools in the catalog, sorted by ID for determinism.
   */
  listTools(): CatalogEntry[] {
    return Array.from(this.tools.values()).sort((a, b) => a.id.localeCompare(b.id));
  }
}
