/**
 * Agentic Mesh SDK - Tool Definitions and Registry
 *
 * This module provides tool descriptors and a registry for managing tools
 * that agents can invoke during task execution.
 */

import type { ToolDescriptor, JsonSchema, UUID, RiskTier } from './types.js';

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * Registry for managing and discovering tools.
 */
export class ToolRegistry {
  private tools: Map<string, ToolDescriptor> = new Map();

  /**
   * Register a tool.
   */
  register(tool: ToolDescriptor): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool.
   */
  unregister(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  /**
   * Get a tool by name.
   */
  get(toolName: string): ToolDescriptor | undefined {
    return this.tools.get(toolName);
  }

  /**
   * List all registered tools.
   */
  list(): ToolDescriptor[] {
    return Array.from(this.tools.values());
  }

  /**
   * Find tools by capability or risk tier.
   */
  find(criteria: { capability?: string; riskTier?: RiskTier; role?: string }): ToolDescriptor[] {
    return this.list().filter((tool) => {
      if (criteria.riskTier && tool.riskTier !== criteria.riskTier) return false;
      if (criteria.role && !tool.requiredRoles.includes(criteria.role)) return false;
      if (criteria.capability) {
        const cap = criteria.capability.toLowerCase();
        if (!tool.name.toLowerCase().includes(cap) && !tool.description.toLowerCase().includes(cap)) {
          return false;
        }
      }
      return true;
    });
  }
}

// ============================================================================
// TOOL BUILDER
// ============================================================================

/**
 * Builder for creating tool descriptors.
 */
export class ToolBuilder {
  private tool: Partial<ToolDescriptor> = {};

  constructor(name: string) {
    this.tool.id = crypto.randomUUID();
    this.tool.name = name;
    this.tool.status = 'active';
    this.tool.requiredRoles = [];
  }

  version(version: string): this {
    this.tool.version = version;
    return this;
  }

  description(description: string): this {
    this.tool.description = description;
    return this;
  }

  inputSchema(schema: JsonSchema): this {
    this.tool.inputSchema = schema;
    return this;
  }

  outputSchema(schema: JsonSchema): this {
    this.tool.outputSchema = schema;
    return this;
  }

  riskTier(tier: RiskTier): this {
    this.tool.riskTier = tier;
    return this;
  }

  rateLimit(limit: number): this {
    this.tool.rateLimit = limit;
    return this;
  }

  requiredRoles(...roles: string[]): this {
    this.tool.requiredRoles = roles;
    return this;
  }

  build(): ToolDescriptor {
    if (!this.tool.name || !this.tool.version || !this.tool.description) {
      throw new Error('Tool must have name, version, and description');
    }
    if (!this.tool.inputSchema || !this.tool.outputSchema) {
      throw new Error('Tool must have input and output schemas');
    }
    if (!this.tool.riskTier) {
      throw new Error('Tool must have a risk tier');
    }
    return this.tool as ToolDescriptor;
  }
}

// ============================================================================
// BUILT-IN TOOL DEFINITIONS
// ============================================================================

/**
 * Git Tool - Operations on git repositories
 */
export const GitTool: ToolDescriptor = {
  id: crypto.randomUUID(),
  name: 'git',
  version: '1.0.0',
  description: 'Git operations: diff, branch, commit, status, log',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['diff', 'status', 'log', 'branch', 'checkout', 'add', 'commit', 'show'],
      },
      args: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          branch: { type: 'string' },
          message: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          limit: { type: 'number' },
        },
      },
    },
    required: ['action'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      output: { type: 'string' },
      error: { type: 'string' },
    },
    required: ['success'],
  },
  riskTier: 'medium',
  rateLimit: 60,
  requiredRoles: ['developer'],
  status: 'active',
};

/**
 * File Read Tool - Read files from the filesystem
 */
export const FileReadTool: ToolDescriptor = {
  id: crypto.randomUUID(),
  name: 'file_read',
  version: '1.0.0',
  description: 'Read file contents from the filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute file path' },
      encoding: { type: 'string', default: 'utf-8' },
      limit: { type: 'number', description: 'Max lines to read' },
    },
    required: ['path'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      content: { type: 'string' },
      size: { type: 'number' },
      error: { type: 'string' },
    },
    required: ['success'],
  },
  riskTier: 'low',
  rateLimit: 120,
  requiredRoles: ['developer'],
  status: 'active',
};

/**
 * File Write Tool - Write files to the filesystem
 */
export const FileWriteTool: ToolDescriptor = {
  id: crypto.randomUUID(),
  name: 'file_write',
  version: '1.0.0',
  description: 'Write content to files on the filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute file path' },
      content: { type: 'string' },
      mode: { type: 'string', enum: ['overwrite', 'append'], default: 'overwrite' },
    },
    required: ['path', 'content'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      bytesWritten: { type: 'number' },
      error: { type: 'string' },
    },
    required: ['success'],
  },
  riskTier: 'medium',
  rateLimit: 30,
  requiredRoles: ['developer'],
  status: 'active',
};

/**
 * HTTP Fetch Tool - Make HTTP requests
 */
export const HttpFetchTool: ToolDescriptor = {
  id: crypto.randomUUID(),
  name: 'http_fetch',
  version: '1.0.0',
  description: 'Make HTTP requests to external APIs (with allowlist enforcement)',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      body: { type: 'string' },
      timeout: { type: 'number', default: 30000 },
    },
    required: ['url'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      status: { type: 'number' },
      headers: { type: 'object' },
      body: { type: 'string' },
      error: { type: 'string' },
    },
    required: ['success'],
  },
  riskTier: 'high',
  rateLimit: 30,
  requiredRoles: ['developer', 'admin'],
  status: 'active',
  costModel: {
    perInvocation: 0.001,
    currency: 'USD',
  },
};

/**
 * Graph Query Tool - Query Neo4j/graph database
 */
export const GraphQueryTool: ToolDescriptor = {
  id: crypto.randomUUID(),
  name: 'graph_query',
  version: '1.0.0',
  description: 'Execute Cypher queries against the graph database',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Cypher query (parameterized)' },
      params: { type: 'object', additionalProperties: true },
      database: { type: 'string', default: 'neo4j' },
      timeout: { type: 'number', default: 30000 },
    },
    required: ['query'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      records: { type: 'array', items: { type: 'object' } },
      summary: {
        type: 'object',
        properties: {
          nodesCreated: { type: 'number' },
          nodesDeleted: { type: 'number' },
          relationshipsCreated: { type: 'number' },
          relationshipsDeleted: { type: 'number' },
        },
      },
      error: { type: 'string' },
    },
    required: ['success'],
  },
  riskTier: 'medium',
  rateLimit: 60,
  requiredRoles: ['developer', 'analyst'],
  status: 'active',
};

/**
 * Search Tool - Search code and documents
 */
export const SearchTool: ToolDescriptor = {
  id: crypto.randomUUID(),
  name: 'search',
  version: '1.0.0',
  description: 'Search across code, documents, and knowledge bases',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      sources: {
        type: 'array',
        items: { type: 'string', enum: ['code', 'docs', 'knowledge', 'web'] },
        default: ['code', 'docs'],
      },
      limit: { type: 'number', default: 10 },
      filters: {
        type: 'object',
        properties: {
          fileType: { type: 'string' },
          path: { type: 'string' },
          dateRange: { type: 'object' },
        },
      },
    },
    required: ['query'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            snippet: { type: 'string' },
            source: { type: 'string' },
            url: { type: 'string' },
            score: { type: 'number' },
          },
        },
      },
      total: { type: 'number' },
      error: { type: 'string' },
    },
    required: ['success'],
  },
  riskTier: 'low',
  rateLimit: 60,
  requiredRoles: [],
  status: 'active',
};

/**
 * Shell Tool - Execute shell commands (restricted)
 */
export const ShellTool: ToolDescriptor = {
  id: crypto.randomUUID(),
  name: 'shell',
  version: '1.0.0',
  description: 'Execute whitelisted shell commands in a sandboxed environment',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string' },
      args: { type: 'array', items: { type: 'string' } },
      cwd: { type: 'string' },
      timeout: { type: 'number', default: 60000 },
      env: { type: 'object', additionalProperties: { type: 'string' } },
    },
    required: ['command'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      stdout: { type: 'string' },
      stderr: { type: 'string' },
      exitCode: { type: 'number' },
      error: { type: 'string' },
    },
    required: ['success'],
  },
  riskTier: 'high',
  rateLimit: 10,
  requiredRoles: ['admin'],
  status: 'active',
};

// ============================================================================
// DEFAULT REGISTRY
// ============================================================================

/**
 * Create a registry with all built-in tools.
 */
export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(GitTool);
  registry.register(FileReadTool);
  registry.register(FileWriteTool);
  registry.register(HttpFetchTool);
  registry.register(GraphQueryTool);
  registry.register(SearchTool);
  registry.register(ShellTool);
  return registry;
}

/**
 * Helper to create a tool quickly.
 */
export function defineTool(name: string): ToolBuilder {
  return new ToolBuilder(name);
}
