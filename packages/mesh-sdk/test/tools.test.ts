/**
 * Tool Registry Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ToolRegistry,
  ToolBuilder,
  GitTool,
  FileReadTool,
  HttpFetchTool,
  createDefaultToolRegistry,
  defineTool,
} from '../../src/tools.js';

describe('ToolRegistry', () => {
  it('should register and retrieve tools', () => {
    const registry = new ToolRegistry();
    registry.register(GitTool);

    const tool = registry.get('git');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('git');
  });

  it('should list all registered tools', () => {
    const registry = new ToolRegistry();
    registry.register(GitTool);
    registry.register(FileReadTool);

    const tools = registry.list();
    expect(tools.length).toBe(2);
  });

  it('should find tools by risk tier', () => {
    const registry = createDefaultToolRegistry();
    const highRiskTools = registry.find({ riskTier: 'high' });

    expect(highRiskTools.length).toBeGreaterThan(0);
    expect(highRiskTools.every((t) => t.riskTier === 'high')).toBe(true);
  });

  it('should unregister tools', () => {
    const registry = new ToolRegistry();
    registry.register(GitTool);
    expect(registry.get('git')).toBeDefined();

    const removed = registry.unregister('git');
    expect(removed).toBe(true);
    expect(registry.get('git')).toBeUndefined();
  });
});

describe('ToolBuilder', () => {
  it('should build a tool descriptor', () => {
    const tool = defineTool('my-tool')
      .version('1.0.0')
      .description('My custom tool')
      .inputSchema({ type: 'object', properties: { input: { type: 'string' } } })
      .outputSchema({ type: 'object', properties: { output: { type: 'string' } } })
      .riskTier('low')
      .rateLimit(100)
      .requiredRoles('developer')
      .build();

    expect(tool.name).toBe('my-tool');
    expect(tool.version).toBe('1.0.0');
    expect(tool.riskTier).toBe('low');
    expect(tool.rateLimit).toBe(100);
  });

  it('should throw if required fields are missing', () => {
    expect(() => {
      defineTool('incomplete').build();
    }).toThrow();
  });
});

describe('createDefaultToolRegistry', () => {
  it('should create a registry with all built-in tools', () => {
    const registry = createDefaultToolRegistry();
    const tools = registry.list();

    expect(tools.length).toBe(7);
    expect(registry.get('git')).toBeDefined();
    expect(registry.get('file_read')).toBeDefined();
    expect(registry.get('file_write')).toBeDefined();
    expect(registry.get('http_fetch')).toBeDefined();
    expect(registry.get('graph_query')).toBeDefined();
    expect(registry.get('search')).toBeDefined();
    expect(registry.get('shell')).toBeDefined();
  });
});

describe('Built-in Tools', () => {
  it('GitTool should have correct schema', () => {
    expect(GitTool.name).toBe('git');
    expect(GitTool.riskTier).toBe('medium');
    expect(GitTool.inputSchema.properties?.action).toBeDefined();
  });

  it('HttpFetchTool should be high risk', () => {
    expect(HttpFetchTool.riskTier).toBe('high');
    expect(HttpFetchTool.requiredRoles).toContain('admin');
  });

  it('FileReadTool should be low risk', () => {
    expect(FileReadTool.riskTier).toBe('low');
  });
});
