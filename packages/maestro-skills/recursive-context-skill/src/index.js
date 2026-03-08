"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecursiveContextSkill = void 0;
const recursive_context_runtime_1 = require("@maestro/recursive-context-runtime");
class RecursiveContextSkill {
    name = "recursive-context-skill";
    validate(config) {
        if (!config.query) {
            throw new Error("Missing required config: query");
        }
        if (!config.context_handle) {
            throw new Error("Missing required config: context_handle");
        }
    }
    async execute(context, step, execution) {
        const { query, context_handle, budgets } = step.config;
        // Initialize Environment
        let env;
        if (context_handle.kind === 'repo') {
            const repoPath = context_handle.metadata?.path || process.cwd();
            env = new recursive_context_runtime_1.FSRepoAdapter(repoPath, context_handle.id);
        }
        else {
            throw new Error(`Unsupported context handle kind: ${context_handle.kind}`);
        }
        // Initialize Budget
        const budget = {
            maxDepth: budgets?.maxDepth ?? 2,
            maxIterations: budgets?.maxIterations ?? 10,
            maxSubcalls: budgets?.maxSubcalls ?? 20,
            maxWallMs: budgets?.maxWallMs ?? 60000,
            maxCostUsd: budgets?.maxCostUsd ?? 5.0
        };
        // Initialize Session
        const session = new recursive_context_runtime_1.RCRSession(env, budget);
        // Initialize Planner (Root LM)
        const planner = new recursive_context_runtime_1.SimplePlanner();
        // Execute
        const answer = await planner.execute(query, session);
        return {
            output: {
                answer,
                trace: session.getTrace(),
                metrics: session.getMetrics()
            },
            cost_usd: session.getMetrics().costUsd,
            metadata: {
                trace_count: session.getTrace().length
            }
        };
    }
}
exports.RecursiveContextSkill = RecursiveContextSkill;
