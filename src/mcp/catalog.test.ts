import { describe, it, expect } from 'vitest';
import { stableToolId } from './catalog.js';
import { McpTool } from './types.js';

describe('mcp_catalog_hash_stability', () => {
  const toolA: McpTool = {
    name: "test-tool",
    description: "A test tool",
    inputSchema: {
      type: "object",
      properties: { a: { type: "string" }, b: { type: "number" } },
      required: ["a"]
    }
  };

  const toolB: McpTool = {
    name: "test-tool",
    description: "Different description should not affect ID",
    inputSchema: {
      type: "object",
      // Swapped property order to test stable hashing
      properties: { b: { type: "number" }, a: { type: "string" } },
      required: ["a"]
    }
  };

  it('generates stable IDs regardless of key order', () => {
    const idA = stableToolId(toolA);
    const idB = stableToolId(toolB);
    expect(idA).toBe(idB);
    expect(idA).toMatch(/^tool:test-tool:[0-9a-f]{12}$/);
  });
});
