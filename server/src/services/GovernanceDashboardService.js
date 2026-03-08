"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceDashboardService = exports.GovernanceDashboardService = void 0;
// @ts-nocheck
const registry_js_1 = require("../../prompts/registry.js");
const runs_repo_js_1 = require("../maestro/runs/runs-repo.js");
class GovernanceDashboardService {
    async getDashboardData(tenantId) {
        const [prompts, runs] = await Promise.all([
            registry_js_1.promptRegistry.getAllPrompts(),
            runs_repo_js_1.runsRepo.list(tenantId, 100), // Fetch last 100 runs for stats
        ]);
        // Calculate Stats
        const totalPrompts = prompts.length;
        const totalRuns = runs.length;
        const failedRuns = runs.filter((r) => r.status === 'failed').length;
        const successRate = totalRuns > 0 ? ((totalRuns - failedRuns) / totalRuns) * 100 : 0;
        // Analyze Prompts for Risk (Heuristic)
        const promptSummaries = prompts.map((p) => {
            let riskLevel = 'low';
            if (p.meta?.tags?.includes('write') || p.meta?.tags?.includes('execute')) {
                riskLevel = 'high';
            }
            else if (p.meta?.tags?.includes('internal')) {
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
        const agentsMap = new Map();
        // From Prompts
        prompts.forEach((p) => {
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
        runs.forEach((r) => {
            const name = r.pipeline || r.pipeline_id;
            const existing = agentsMap.get(name);
            const runStatus = r.status === 'failed' ? 'error' :
                r.status === 'running' ? 'active' :
                    'idle';
            if (existing) {
                if (r.created_at > (existing.lastRun || new Date(0))) {
                    existing.lastRun = r.created_at;
                    existing.status = runStatus;
                }
            }
            else {
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
            recentRuns: runs.slice(0, 10).map((r) => ({
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
exports.GovernanceDashboardService = GovernanceDashboardService;
exports.governanceDashboardService = new GovernanceDashboardService();
