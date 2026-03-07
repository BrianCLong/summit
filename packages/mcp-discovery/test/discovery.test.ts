import { describe, it, expect } from 'vitest';
import { ToolIndex } from '../src/index/buildIndex';
import { scoreTool } from '../src/ranking/scoreTool';
import { ToolSelector } from '../src/selectors/selectTools';
import { ToolDescriptor } from '@summit/mcp-registry';

describe('MCP Discovery', () => {
  const mockTools: ToolDescriptor[] = [
    { serverId: 'summit-graphrag', name: 'search_knowledge', description: 'Search the GraphRAG', capabilityTags: ['search.semantic'], riskTags: [] },
    { serverId: 'external-tool', name: 'write_data', description: 'Write data externally', capabilityTags: ['search.semantic'], riskTags: ['risk.write.external'] },
  ];

  it('should build an index and retrieve tools by capability', () => {
    const index = new ToolIndex(mockTools);
    const tools = index.getToolsByCapability('search.semantic');
    expect(tools).toHaveLength(2);
  });

  it('should score tools based on metrics', () => {
    const score1 = scoreTool({ capabilityFit: 1.0, trustScore: 0.8, freshnessScore: 1.0, p95LatencyMs: 150, riskScore: 0 });
    const score2 = scoreTool({ capabilityFit: 1.0, trustScore: 0.8, freshnessScore: 1.0, p95LatencyMs: 500, riskScore: 0.5 });

    expect(score1).toBeGreaterThan(score2);
  });

  it('should select tools deterministically and filter by policy', () => {
    const index = new ToolIndex(mockTools);
    const selector = new ToolSelector(index);

    const result = selector.selectTools({ capability: 'search.semantic', tenantId: 'tenant-a' });

    // external-tool is high risk and tenant is not admin
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].tool.serverId).toBe('summit-graphrag');
  });

  it('should allow admin tenant to select high risk tools', () => {
    const index = new ToolIndex(mockTools);
    const selector = new ToolSelector(index);

    const result = selector.selectTools({ capability: 'search.semantic', tenantId: 'admin' });

    // admin tenant can select both tools
    expect(result.tools).toHaveLength(2);
    // summit-graphrag has lower risk score, so it should be scored higher
    expect(result.tools[0].tool.serverId).toBe('summit-graphrag');
    expect(result.tools[1].tool.serverId).toBe('external-tool');
  });
});
