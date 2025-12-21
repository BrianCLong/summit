import { promptRegistry } from '../../prompts/registry.js';
import { runsRepo, type Run } from '../maestro/runs/runs-repo.js';
import type { PromptConfig } from '../../prompts/types.js';

interface RecentRun {
  id: string;
  pipeline: string;
  status: string;
  duration: number | null;
  createdAt: Date;
  error: string | null;
}

export interface GovernanceStats {
  totalAgents: number;
  totalPrompts: number;
  highRiskPrompts: number;
  totalRuns: number;
  failedRuns: number;
  successRate: number;
  prsGenerated: number; // Mocked for now
}

export interface AgentSummary {
  id: string;
  name: string;
  type: string; // 'pipeline' | 'agent'
  lastRun?: Date;
  status: 'active' | 'idle' | 'error';
}

export interface PromptSummary {
  id: string;
  riskLevel: 'low' | 'medium' | 'high';
  tags: string[];
  version: string;
}

export class GovernanceDashboardService {
  async getDashboardData(tenantId: string): Promise<{
    stats: GovernanceStats;
    agents: AgentSummary[];
    prompts: PromptSummary[];
    recentRuns: RecentRun[];
  }> {
    const [prompts, runs]: [PromptConfig[], Run[]] = await Promise.all([
      promptRegistry.getAllPrompts(),
      runsRepo.list(tenantId, 100), // Fetch last 100 runs for stats
    ]);

    // Calculate Stats
    const totalPrompts = prompts.length;
    const totalRuns = runs.length;
    const failedRuns = runs.filter((r: Run) => r.status === 'failed').length;
    const successRate = totalRuns > 0 ? ((totalRuns - failedRuns) / totalRuns) * 100 : 0;

    // Analyze Prompts for Risk (Heuristic)
    const promptSummaries: PromptSummary[] = prompts.map((p: PromptConfig) => {
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (p.meta?.tags?.includes('write') || p.meta?.tags?.includes('execute')) {
        riskLevel = 'high';
      } else if (p.meta?.tags?.includes('internal')) {
        riskLevel = 'medium';
      }
      return {
        id: p.meta.id,
        riskLevel,
        tags: p.meta.tags || [],
        version: p.meta.version || 'v1',
      };
    });

    const highRiskPrompts = promptSummaries.filter((p) => p.riskLevel === 'high').length;

    // Identify Agents from Runs and Prompts
    // We treat unique 'pipeline_name' from runs as agents,
    // and also any prompt IDs starting with 'agent.'
    const agentsMap = new Map<string, AgentSummary>();

    // From Prompts
    prompts.forEach((p: PromptConfig) => {
      if (p.meta.id.startsWith('agent.')) {
        const name = p.meta.id.split('.')[1];
        agentsMap.set(name, {
          id: p.meta.id,
          name: name,
          type: 'agent',
          status: 'idle',
        });
      }
    });

    // From Runs
    runs.forEach((r: Run) => {
      const name = r.pipeline || r.pipeline_id;
      const existing = agentsMap.get(name);
      const runStatus: 'active' | 'idle' | 'error' =
        r.status === 'failed' ? 'error' :
        r.status === 'running' ? 'active' :
        'idle';

      if (existing) {
        if (r.created_at > (existing.lastRun || new Date(0))) {
          existing.lastRun = r.created_at;
          existing.status = runStatus;
        }
      } else {
        agentsMap.set(name, {
          id: r.pipeline_id,
          name: name,
          type: 'pipeline',
          lastRun: r.created_at,
          status: runStatus,
        });
      }
    });

    const agents = Array.from(agentsMap.values());

    return {
      stats: {
        totalAgents: agents.length,
        totalPrompts,
        highRiskPrompts,
        totalRuns,
        failedRuns,
        successRate,
        prsGenerated: Math.floor(Math.random() * 10), // Mocked
      },
      agents,
      prompts: promptSummaries,
      recentRuns: runs.slice(0, 10).map((r: Run): RecentRun => ({
        id: r.id,
        pipeline: r.pipeline,
        status: r.status,
        duration: r.duration_ms,
        createdAt: r.created_at,
        error: r.error_message
      })),
    };
  }
}

export const governanceDashboardService = new GovernanceDashboardService();
