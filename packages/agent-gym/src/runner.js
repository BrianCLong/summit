"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GymRunner = void 0;
const uuid_1 = require("uuid");
class GymRunner {
    env;
    agent;
    options;
    constructor(env, agent, options = {}) {
        this.env = env;
        this.agent = agent;
        this.options = options;
    }
    async runEpisode(options) {
        const episodeId = (0, uuid_1.v4)();
        const maxSteps = this.options.maxSteps || 50;
        const turns = [];
        let score = 0;
        let success = false;
        let error;
        try {
            let observation = await this.env.reset(options);
            for (let step = 0; step < maxSteps; step++) {
                const startTime = Date.now();
                // Agent acts
                const action = await this.agent.act(observation);
                // Environment responds
                const result = await this.env.step(action);
                const durationMs = Date.now() - startTime;
                turns.push({
                    step,
                    observation, // The observation BEFORE the action
                    action,
                    feedback: result.feedback,
                    info: result.info,
                    durationMs
                });
                score += result.feedback.reward || 0;
                observation = result.observation;
                if (result.done) {
                    success = result.feedback.success;
                    break;
                }
            }
        }
        catch (e) {
            error = e.message;
        }
        return {
            episodeId,
            environment: this.env.name,
            success,
            score,
            turns,
            metadata: {},
            error
        };
    }
}
exports.GymRunner = GymRunner;
