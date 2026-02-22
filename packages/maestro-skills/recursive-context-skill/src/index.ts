import { StepPlugin, RunContext, WorkflowStep, StepExecution } from '@maestro/core';
import {
    FSRepoAdapter,
    RCRSession,
    SimplePlanner,
    RecursionBudget,
    InspectEnv
} from '@maestro/recursive-context-runtime';

export class RecursiveContextSkill implements StepPlugin {
    name = "recursive-context-skill";

    validate(config: any): void {
        if (!config.query) {
            throw new Error("Missing required config: query");
        }
        if (!config.context_handle) {
            throw new Error("Missing required config: context_handle");
        }
    }

    async execute(
        context: RunContext,
        step: WorkflowStep,
        execution: StepExecution
    ): Promise<{
        output?: any;
        cost_usd?: number;
        metadata?: Record<string, any>;
    }> {
        const { query, context_handle, budgets } = step.config;

        // Initialize Environment
        let env: InspectEnv;
        if (context_handle.kind === 'repo') {
             const repoPath = context_handle.metadata?.path || process.cwd();
             env = new FSRepoAdapter(repoPath, context_handle.id);
        } else {
            throw new Error(`Unsupported context handle kind: ${context_handle.kind}`);
        }

        // Initialize Budget
        const budget: RecursionBudget = {
            maxDepth: budgets?.maxDepth ?? 2,
            maxIterations: budgets?.maxIterations ?? 10,
            maxSubcalls: budgets?.maxSubcalls ?? 20,
            maxWallMs: budgets?.maxWallMs ?? 60000,
            maxCostUsd: budgets?.maxCostUsd ?? 5.0
        };

        // Initialize Session
        const session = new RCRSession(env, budget);

        // Initialize Planner (Root LM)
        const planner = new SimplePlanner();

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
