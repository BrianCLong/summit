"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayRunner = void 0;
class ReplayRunner {
    async replay(trace, context) {
        const replayTraceId = `replay-${trace.id}-${Date.now()}`;
        const stepResults = [];
        let success = true;
        for (const step of trace.steps) {
            if (step.type !== 'action')
                continue;
            try {
                // In a real replay, we might use the original inputs or overridden inputs
                const output = await this.executeStep(step.name, step.inputs);
                // Compare output with original output
                const matched = JSON.stringify(output) === JSON.stringify(step.outputs);
                stepResults.push({
                    stepId: step.id,
                    matched,
                    output
                });
                if (!matched && context.strictMode) {
                    success = false;
                    break;
                }
            }
            catch (error) {
                stepResults.push({
                    stepId: step.id,
                    matched: false,
                    error: error.message
                });
                success = false;
            }
        }
        return {
            success,
            traceId: trace.id,
            replayTraceId,
            stepResults
        };
    }
}
exports.ReplayRunner = ReplayRunner;
