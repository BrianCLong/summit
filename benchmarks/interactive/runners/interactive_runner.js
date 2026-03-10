// Sentinel exports for TypeScript interfaces erased at compile time
export const TraceEvent = {};
export const RunConfig = {};
export const RunResult = {};
export const BenchmarkAgent = {};

export async function runInteractive(config, environment, agent) {
    const traces = [];
    let stepsTaken = 0;
    let finalReward = 0;
    const wallclockLimit = config.budgetPolicy.wallclockLimitMs;
    const startTime = Date.now();
    await agent.init(config);
    let obs = await environment.reset(config.seed, config.budgetPolicy);
    while (!environment.isTerminal() && stepsTaken < config.maxSteps) {
        const budget = environment.budget();
        if (budget.steps_remaining <= 0) {
            break;
        }
        // Wallclock budget check
        if (wallclockLimit !== undefined && (Date.now() - startTime) > wallclockLimit) {
            await agent.finalize();
            return {
                suiteId: config.suiteId,
                caseId: config.caseId,
                agentId: config.agentId,
                seed: config.seed,
                stepsTaken,
                finalReward,
                success: false,
                traces,
                error: 'Wallclock budget exceeded',
            };
        }
        const action = await agent.act(obs, {}, budget);
        // Check wallclock again after potentially-slow agent.act
        if (wallclockLimit !== undefined && (Date.now() - startTime) > wallclockLimit) {
            await agent.finalize();
            return {
                suiteId: config.suiteId,
                caseId: config.caseId,
                agentId: config.agentId,
                seed: config.seed,
                stepsTaken,
                finalReward,
                success: false,
                traces,
                error: 'Wallclock budget exceeded',
            };
        }
        const stepResult = await environment.step(action);
        await agent.update(stepResult);
        stepsTaken++;
        finalReward += stepResult.reward;
        obs = stepResult.observation;
        traces.push({
            step: stepsTaken,
            timestamp: '1970-01-01T00:00:00Z',
            action,
            observation: obs,
            reward: stepResult.reward,
            budget,
        });
        if (stepResult.done) {
            break;
        }
    }
    await agent.finalize();
    return {
        suiteId: config.suiteId,
        caseId: config.caseId,
        agentId: config.agentId,
        seed: config.seed,
        stepsTaken,
        finalReward,
        success: finalReward > 0,
        traces,
    };
}
