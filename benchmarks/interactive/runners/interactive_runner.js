"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInteractive = runInteractive;
async function runInteractive(config, environment, agent) {
    const startTime = Date.now();
    let stepsTaken = 0;
    let finalReward = 0;
    const traces = [];
    try {
        let observation = await environment.reset(config.seed, config);
        await agent.init(config);
        const memory = { history: [] };
        while (!environment.isTerminal() && stepsTaken < config.budgetPolicy.maxSteps) {
            if (Date.now() - startTime > config.budgetPolicy.wallclockLimitMs) {
                throw new Error('Wallclock budget exceeded');
            }
            const budget = environment.budget();
            const action = await agent.act(observation, memory, budget);
            const stepResult = await environment.step(action);
            await agent.update(stepResult);
            traces.push({
                step: stepsTaken,
                timestamp: `step_${stepsTaken}`, // Deterministic timestamp string
                action,
                observation: stepResult.observation,
                reward: stepResult.reward,
                budget: environment.budget()
            });
            observation = stepResult.observation;
            finalReward += stepResult.reward;
            stepsTaken++;
            if (stepResult.done)
                break;
        }
        return {
            suiteId: config.suiteId,
            caseId: config.caseId,
            agentId: config.agentId,
            success: true,
            stepsTaken,
            timeElapsedMs: Date.now() - startTime,
            finalReward,
            traces
        };
    }
    catch (err) {
        return {
            suiteId: config.suiteId,
            caseId: config.caseId,
            agentId: config.agentId,
            success: false,
            stepsTaken,
            timeElapsedMs: Date.now() - startTime,
            finalReward,
            error: err.message,
            traces
        };
    }
}
