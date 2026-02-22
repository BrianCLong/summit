import { McpTool } from './types.js';

/**
 * Configuration for a single MCP server connection.
 * Represents a static manifest or a runtime configuration.
 */
export interface McpServerConfig {
  id: string;
  url: string;
  description?: string;
  /**
   * Optional: explicit list of tools this server is known to provide.
   * If omitted, tools may be discovered at runtime via 'tools/list'.
   */
  tools?: McpTool[];
  riskTier?: "low" | "medium" | "high";
}

/**
 * Parse and validate a raw JSON object as an McpServerConfig.
 * Throws if required fields are missing.
 */
export function parseServerConfig(json: unknown): McpServerConfig {
  if (typeof json !== 'object' || json === null) {
    throw new Error("Manifest must be an object");
  }

  const config = json as Record<string, unknown>;

  if (typeof config.id !== 'string' || !config.id) {
    throw new Error("Manifest missing required field: id");
  }
  if (typeof config.url !== 'string' || !config.url) {
    throw new Error("Manifest missing required field: url");
  }

  // Optional validation for tools
  if (config.tools && !Array.isArray(config.tools)) {
    throw new Error("Field 'tools' must be an array");
  }

  return {
    id: config.id,
    url: config.url,
    description: typeof config.description === 'string' ? config.description : undefined,
    tools: config.tools as McpTool[] | undefined,
    riskTier: (['low', 'medium', 'high'].includes(config.riskTier as string))
      ? (config.riskTier as "low" | "medium" | "high")
      : undefined
  };
}
