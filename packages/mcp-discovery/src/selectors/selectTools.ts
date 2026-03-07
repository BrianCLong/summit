import { ToolDescriptor } from '@summit/mcp-registry';
import { scoreTool } from '../ranking/scoreTool';

export interface SelectToolsRequest {
  capability: string;
  tenantId: string;
  maxResults?: number;
}

export interface ScoredTool {
  tool: ToolDescriptor;
  score: number;
}

export interface SelectToolsResponse {
  tools: ScoredTool[];
  evidenceId: string;
}

// Mock Policy check for MWS
function checkPolicy(tool: ToolDescriptor, tenantId: string): boolean {
  // deny-by-default logic for high risk tools in prod (mock)
  if (tool.riskTags.includes('risk.write.external') && tenantId !== 'admin') {
      return false;
  }
  return true;
}

// Mock metric retrieval
function getMetrics(tool: ToolDescriptor): { p95LatencyMs: number } {
  return { p95LatencyMs: 150 }; // default mock
}

export class ToolSelector {
  constructor(private index: { getToolsByCapability(capability: string): ToolDescriptor[] }) {}

  selectTools(req: SelectToolsRequest): SelectToolsResponse {
    const candidateTools = this.index.getToolsByCapability(req.capability);
    const scoredTools: ScoredTool[] = [];

    for (const tool of candidateTools) {
      if (!checkPolicy(tool, req.tenantId)) {
        continue;
      }

      const metrics = getMetrics(tool);
      const score = scoreTool({
        capabilityFit: 1.0, // exact match for now
        trustScore: 0.8,    // default trust
        freshnessScore: 1.0, // fresh metadata
        p95LatencyMs: metrics.p95LatencyMs,
        riskScore: tool.riskTags.length * 0.5 // mock risk penalty
      });

      scoredTools.push({ tool, score });
    }

    // Sort deterministically by score (desc) then by serverId then by name
    scoredTools.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.tool.serverId !== b.tool.serverId) return a.tool.serverId.localeCompare(b.tool.serverId);
      return a.tool.name.localeCompare(b.tool.name);
    });

    const maxResults = req.maxResults ?? 10;
    const finalTools = scoredTools.slice(0, maxResults);

    return {
      tools: finalTools,
      evidenceId: `EID:MCP:discovery:selectTools:tenant:${req.tenantId}:${req.capability}`,
    };
  }
}
