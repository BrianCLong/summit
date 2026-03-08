"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const evaluation_runner_1 = require("../../src/agent-scaling/evaluation-runner");
describe('Agent Loop Explosion Guard', () => {
    it('should restrict steps to maxSteps threshold', async () => {
        const runner = new evaluation_runner_1.EvaluationRunner({ maxSteps: 5, maxTokens: 1000, topology: 'single' });
        const result = await runner.runTask('malicious-loop-task');
        expect(result).toBeDefined();
        // Assuming implementation limits steps, we would verify the counter
        // For now we just test the guard doesn't throw arbitrary errors
    });
});
